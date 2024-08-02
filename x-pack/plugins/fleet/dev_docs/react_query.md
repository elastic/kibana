# `@tanstack/query` Usage in Fleet + Integrations

This document seeks to outline the Fleet + Integrations apps' usage of [`@tanstack/query`](https://tanstack.com/query/latest) - formally known generally as `react-query`. When we talk about the React-specific adapter for `@tanstack/query`, we'll use the library name `react-query`. Since Kibana doesn't have Vue, Solid, or Svelte plugins, we don't need to be worried about the other client implementations. This is a library for asynchronous state management that's most commonly utilized for data fetching logic. `@tanstack/query` helps developers write consistent state management logic around asynchronous operations, while providing end users with a performant, "jank-free" experience.

## Helpful Links

- `react-query` [docs](https://tanstack.com/query/latest/docs/react/overview)
- [Practical React Query](https://tanstack.com/query/latest/docs/react/overview) by maintainer [TkDodo](https://github.com/tkdodo)
  - This series is long but extremely helpful. A highly recommended read for anyone working with data fetching in Fleet/Integrations!
- `@tanstack/query` source code on GitHub: https://github.com/TanStack/query

## How Fleet/Integrations uses custom data fetching hooks

Historically, Fleet/Integrations have used homegrown data fetching hooks in a common folder at [`public/hooks/use_request`](https://github.com/elastic/kibana/tree/main/x-pack/plugins/fleet/public/hooks/use_request). Each `.ts` file in this directory contains one or more data fetching hooks related to a particular resource or concept. For example, here's what some data fetching hooks for `packages` and `categories` might look like:

```ts
// use_request/epm.ts

export const useGetCategories = (query: GetCategoriesRequest['query'] = {}) => {
  return useRequest<GetCategoriesResponse>({
    path: epmRouteService.getCategoriesPath(),
    method: 'get',
    query,
  });
};

export const sendGetCategories = (query: GetCategoriesRequest['query'] = {}) => {
  return sendRequest<GetCategoriesResponse>({
    path: epmRouteService.getCategoriesPath(),
    method: 'get',
    query,
  });
};

export const useGetPackages = (query: GetPackagesRequest['query'] = {}) => {
  return useRequest<GetPackagesResponse>({
    path: epmRouteService.getListPath(),
    method: 'get',
    query,
  });
};

export const sendGetPackages = (query: GetPackagesRequest['query'] = {}) => {
  return sendRequest<GetPackagesResponse>({
    path: epmRouteService.getListPath(),
    method: 'get',
    query,
  });
};
```

<details>
<summary>What are <code>useRequest</code> and <code>sendRequest</code>?</summary>

The `useRequest` and `sendRequest` methods are common across all of these data fetching hooks, and use Kibana's provide `useRequest` hook and `sendRequest` helper with some additional logic on top. e.g.

```ts
// use_request/use_request.ts - excerpts for clarity

import {
  sendRequest as _sendRequest,
  useRequest as _useRequest,
} from '@kbn/es-ui-shared-plugin/public';

export const sendRequest = <D = any, E = RequestError>(
  config: SendRequestConfig
): Promise<SendRequestResponse<D, E>> => {
  if (!httpClient) {
    throw new Error('sendRequest has no http client set');
  }
  return _sendRequest<D, E>(httpClient, config);
};

export const useRequest = <D = any, E = RequestError>(config: UseRequestConfig) => {
  if (!httpClient) {
    throw new Error('sendRequest has no http client set');
  }
  return _useRequest<D, E>(httpClient, config);
};
```

</details>

Consuming these data fetching hooks might look something like this

```tsx
// applications/integrations/sections/epm/screens/detail/settings/update_button.tsx
const handleClickUpgradePolicies = useCallback(async () => {
  if (isUpgradingPackagePolicies) {
    return;
  }

  setIsUpdateModalVisible(false);
  setIsUpgradingPackagePolicies(true);

  await installPackage({ name, version, title });

  await sendUpgradePackagePolicy(
    // Only upgrade policies that don't have conflicts
    packagePolicyIds.filter(
      (id) => !dryRunData?.find((dryRunRecord) => dryRunRecord.diff?.[0].id === id)?.hasErrors
    )
  );

  setIsUpgradingPackagePolicies(false);

  notifications.toasts.addSuccess({
    title: toMountPoint(
      <FormattedMessage
        id="xpack.fleet.integrations.packageUpdateSuccessTitle"
        defaultMessage="Updated {title} and upgraded policies"
        values={{ title }}
      />,
      { theme$ }
    ),
    text: toMountPoint(
      <FormattedMessage
        id="xpack.fleet.integrations.packageUpdateSuccessDescription"
        defaultMessage="Successfully updated {title} and upgraded policies"
        values={{ title }}
      />,
      { theme$ }
    ),
  });

  navigateToNewSettingsPage();
}, [
  dryRunData,
  installPackage,
  isUpgradingPackagePolicies,
  name,
  navigateToNewSettingsPage,
  notifications.toasts,
  packagePolicyIds,
  setIsUpgradingPackagePolicies,
  title,
  version,
  theme$,
]);
```

In the "custom data fetching" hooks world, there are a few big problems:

1. Caching, cancellation, deduping/debouncing successive requests, and optimizations around re-renders are an afterthought
2. Mutations in particular are extremely verbose, as we need to "wire up" all error/loading state, "post-mutation" operations, etc
3. Revalidating queries from elsewhere in the component tree (e.g. update the agent policy table when a new agent policy is saved) is a tricky operation usually solved by intermittent polling or a `location.reload()`

## How `react-query` helps

`react-query` handles many of the "big problems" above out-of-the-box. By providing a basic key/value based cache for queries, consistent utilities around state transitions of async operations, and robust revalidation helpers, `react-query` makes working with the state around data fetching much more predictable and pleasant.

### How Fleet/Integrations uses `react-query`

There's a bit of setup involved to actually get `react-query` up and running. First and foremost, each Kibana application is wrapped in a `<QueryClientProvider>` that handles `react-query`'s internal query cache and various React context needs. e.g.

```tsx
//...
<QueryClientProvider client={queryClient}>
  <ReactQueryDevtools initialIsOpen={true} />
  <UIExtensionsContext.Provider value={extensions}>
    <FleetStatusProvider>
      <Router history={history}>
        <PackageInstallProvider notifications={startServices.notifications} theme$={theme$}>
          <FlyoutContextProvider>{children}</FlyoutContextProvider>
        </PackageInstallProvider>
      </Router>
    </FleetStatusProvider>
  </UIExtensionsContext.Provider>
</QueryClientProvider>
```

We also set up `react-query`'s [dev tools](https://tanstack.com/query/v4/docs/react/devtools), which provide a useful developer console for debugging query and mutation state across the whole application.

Another step required to use `react-query` in Fleet/Integrations is the introduction of a specialized data fetching utility. `react-query` operations expect a slightly different structure than what Kibana's `useRequest` and `sendRequest` helpers. For this purpose, we introduce the `sendRequestForRq` helper, e.g.

```ts
// Sends requests with better ergonomics for React Query, e.g. throw error rather
// than resolving with an `error` property in the result. Also returns `data` directly
// as opposed to { data } in a response object.
export const sendRequestForRq = async <D = any, E = RequestError>(
  config: SendRequestConfig
): Promise<D> => {
  if (!httpClient) {
    throw new Error('sendRequest has no http client set');
  }

  const response = await _sendRequest<D, E>(httpClient, config);

  if (response.error) {
    throw response.error;
  }

  // Data can't be null so long as `_sendRequest` did not throw
  return response.data!;
};
```

So, with those pieces of setup in mind, adding a new query or mutation looks like this:

```ts
export function useGetCategoriesQuery(query: GetCategoriesRequest['query'] = {}) {
  return useQuery<GetCategoriesResponse, RequestError>(['categories', query], () =>
    sendRequestForRq<GetCategoriesResponse>({
      path: epmRouteService.getCategoriesPath(),
      method: 'get',
      query,
    })
  );
}

export const useGetPackagesQuery = (query: GetPackagesRequest['query']) => {
  return useQuery<GetPackagesResponse, RequestError>(['get-packages', query.prerelease], () =>
    sendRequestForRq<GetPackagesResponse>({
      path: epmRouteService.getListPath(),
      method: 'get',
      query,
    })
  );
};

export const useUpdatePackageMutation = () => {
  return useMutation<UpdatePackageResponse, RequestError, UpdatePackageArgs>(
    ({ pkgName, pkgVersion, body }: UpdatePackageArgs) =>
      sendRequestForRq<UpdatePackageResponse>({
        path: epmRouteService.getUpdatePath(pkgName, pkgVersion),
        method: 'put',
        body,
      })
  );
};
```

### `react-query` operation naming conventions

For `react-query` operations defined in `use_request/`, try to use a naming convention along the lines of `use{Action}{Resource}{Query/Mutation}` for your hooks. This helps with consistency and makes the intent of every data fetching operation clear.
