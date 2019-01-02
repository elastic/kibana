# Page loader

Routing in React is not easy, nether is ensuring a clean and simple api within pages.
This solves for both without massive config files. It also ensure URL paths match our files to make things easier to find

It works like this...

```ts
// Create a webpack context, ensureing all pages in the pages dir are included in the build
const requirePages = require.context('./pages', true, /\.tsx$/);
// Pass the context based require into the RouteTreeBuilder for require the files as-needed
const routeTreeBuilder = new RouteTreeBuilder(requirePages);
// turn the array of file paths from the require context into a nested tree of routes based on folder structure
const routesFromFilesystem = routeTreeBuilder.routeTreeFromPaths(requirePages.keys(), {
  '/tag': ['action', 'tagid?'], // add params to a page. In this case /tag turns into /tag/:action/:tagid?
  '/beat': ['beatId'],
  '/beat/detail': ['action'], // it nests too, in this case, because of the above line, this is /beat/:beatId/detail/:action
});
```

In the above example to allow for flexability, the `./pages/beat.tsx` page would receve a prop of `routes` that is an array of sub-pages
