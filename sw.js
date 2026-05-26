/* ═══════════════════════════════════════════════════
   NEXUS INTELLIGENCE SUITE — Service Worker v3.0.0
   Full PWA Offline Support + Background Sync
═══════════════════════════════════════════════════ */
'use strict';

const CACHE_NAME = 'nexus-v3.0.0';
const STATIC_ASSETS = [
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Share+Tech+Mono&family=Rajdhani:wght@300;400;500;600;700&display=swap'
];

/* ── INSTALL: Cache all static assets ── */
self.addEventListener('install', event => {
  console.log('[NEXUS SW] Installing v3.0.0...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[NEXUS SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('[NEXUS SW] Some assets failed to cache:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

/* ── ACTIVATE: Clean old caches ── */
self.addEventListener('activate', event => {
  console.log('[NEXUS SW] Activating...');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[NEXUS SW] Deleting old cache:', k);
          return caches.delete(k);
        })
      )
    ).then(() => self.clients.claim())
  );
});

/* ── FETCH: Network-first for API, Cache-first for assets ── */
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip non-GET and Chrome extension requests
  if (event.request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;

  // API calls — network only, never cache
  if (
    url.hostname === 'api.x.ai' ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('gstatic.com')
  ) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ error: 'Offline — API unavailable' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  // HTML pages — Network-first, fallback to cache
  if (event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request).then(cached => cached || caches.match('./index.html')))
    );
    return;
  }

  // Everything else — Cache-first, then network
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(res => {
        if (!res || res.status !== 200 || res.type === 'opaque') return res;
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return res;
      }).catch(() => {
        // Return offline fallback for images
        if (event.request.destination === 'image') {
          return new Response(
            '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#04040a"/><text x="100" y="110" text-anchor="middle" fill="#10ffb0" font-size="14" font-family="monospace">NEXUS OFFLINE</text></svg>',
            { headers: { 'Content-Type': 'image/svg+xml' } }
          );
        }
      });
    })
  );
});

/* ── PUSH NOTIFICATIONS (future use) ── */
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'NEXUS Intelligence Suite';
  const options = {
    body: data.body || 'New notification from NEXUS',
    icon: './icons/icon-192.png',
    badge: './icons/icon-72.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || './' },
    actions: [
      { action: 'open', title: 'Open NEXUS' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url || './')
    );
  }
});

/* ── BACKGROUND SYNC (future use) ── */
self.addEventListener('sync', event => {
  if (event.tag === 'nexus-sync') {
    console.log('[NEXUS SW] Background sync triggered');
  }
});

console.log('[NEXUS SW] v3.0.0 loaded — NEXUS Intelligence Suite PWA');
