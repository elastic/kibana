# APM Plugin Routing and Linking

## Routing

This document describes routing in the APM plugin.

### Server-side

Route definitions for APM's server-side API are in the [server/routes directory](../server/routes). Routes are created with [the `createRoute` function](../server/routes/create_route.ts). Routes are added to the API in [the `createApmApi` function](../server/routes/create_apm_api.ts), which is initialized in the plugin `start` lifecycle method.

The path and query string parameters are defined in the calls to `createRoute` with io-ts types, so that each route has its parameters type checked.

### Client-side

The client-side routing uses [React Router](https://reactrouter.com/), The [`ApmRoute` component from the Elastic RUM Agent](https://www.elastic.co/guide/en/apm/agent/rum-js/current/react-integration.html), and the `history` object provided by the Kibana Platform.

Routes are defined in [public/components/app/Main/route_config/index.tsx](../public/components/app/Main/route_config/index.tsx). These contain route definitions as well as the breadcrumb text.

## Linking

Raw URLs should almost never be used in the APM UI. Instead, we have mechanisms for creating links and URLs that ensure links are reliable.

### In-app linking

Links that stay inside APM should use the [`getAPMHref` function and `APMLink` component](../public/components/shared/Links/apm/APMLink.tsx). Other components inside that directory contain other functions and components that provide the same functionality for linking to more specific sections inside the APM plugin.

### Cross-app linking

Other helpers and components in [the Links directory](../public/components/shared/Links) allow linking to other Kibana apps.
