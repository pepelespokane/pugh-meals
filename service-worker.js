// Pugh Meals service worker — network-first strategy.
// Ensures each app launch tries to fetch the latest version from the server.
// Falls back to cache only if offline.

const CACHE_NAME = 'pugh-meals-v1';
const APP_SHELL = [
  './',
  './index.html',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      clients.claim(),
      // Clear out any old caches
      caches.keys().then(names =>
        Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
      ),
    ])
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle same-origin requests
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Update cache with the fresh version
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => {
        // Network failed, serve from cache
        return caches.match(event.request).then(cached =>
          cached || caches.match('./index.html')
        );
      })
  );
});

// Allow the page to request a manual update check
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
