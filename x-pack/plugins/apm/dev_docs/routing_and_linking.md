# APM Plugin Routing and Linking

## Routing

This document describes routing in the APM plugin.

### Server-side

Route definitions for APM's server-side API are in the [server/routes directory](../server/routes). Routes are created with [the `createApmServerRoute` function](../server/routes/apm_routes/create_apm_server_route.ts). Routes are added to the API in [the `registerRoutes` function](../server/routes/apm_routes/register_apm_server_routes.ts), which is initialized in the plugin `setup` lifecycle method.

The path and query string parameters are defined in the calls to `createApmServerRoute` with io-ts types, so that each route has its parameters type checked.

### Client-side

The client-side routing uses `@kbn/typed-react-router-config`, which is a wrapper around [React Router](https://reactrouter.com/) and [React Router Config](https://www.npmjs.com/package/react-router-config). Its goal is to provide a layer of high-fidelity types that allows us to parse and format URLs for routes while making sure the needed parameters are provided and/or available (typed and validated at runtime). The `history` object used by React Router is injected by the Kibana Platform.

Routes (and their parameters) are defined in [public/components/routing/apm_route_config.tsx](../public/components/routing/apm_route_config.tsx).

#### Parameter handling

Path (like `serviceName` in '/services/{serviceName}/transactions') and query parameters are defined in the route definitions.

For each parameter, an io-ts runtime type needs to be present:

```tsx
{
  route: '/services/{serviceName}',
  element: <Outlet/>,
  params: t.intersection([
    t.type({
      path: t.type({
        serviceName: t.string,
      })
    }),
    t.partial({
      query: t.partial({
        transactionType: t.string
      })
    })
  ])
}
```

To be able to use the parameters, you can use `useApmParams`, which will automatically infer the parameter types from the route path:

```ts
const {
  path: { serviceName }, // string
  query: { transactionType }, // string | undefined
} = useApmParams('/services/:serviceName');
```

`useApmParams` will strip query parameters for which there is no validation. The route path should match exactly, but you can also use wildcards: `useApmParams('/*)`. In that case, the return type will be a union type of all possible matching routes.

Previously we used `useLegacyUrlParams` for path and query parameters, which we are trying to get away from. When possible, any usage of `useLegacyUrlParams` should be replaced by `useApmParams` or other custom hooks that use `useApmParams` internally.

## Linking

Raw URLs should almost never be used in the APM UI. Instead, we have mechanisms for creating links and URLs that ensure links are reliable.

### In-app linking

For links that stay inside APM, the preferred way of linking is to call the `useApmRouter` hook, and call `router.link` with the route path and required path and query parameters:

```ts
const apmRouter = useApmRouter();
const serviceOverviewLink = apmRouter.link('/services/:serviceName', {
  path: { serviceName: 'opbeans-java' },
  query: { transactionType: 'request' },
});
```

If you're not in React context, you can also import `apmRouter` directly and call its `link` function - but you have to prepend the basePath manually in that case.

We also have the [`getLegacyApmHref` function and `APMLink` component](../public/components/shared/links/apm/APMLink.tsx), but we should consider them deprecated, in favor of `router.link`. Other components inside that directory contain other functions and components that provide the same functionality for linking to more specific sections inside the APM plugin.

### Cross-app linking

Other helpers and components in [the Links directory](../public/components/shared/links) allow linking to other Kibana apps.
