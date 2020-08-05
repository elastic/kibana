# Kibana GlobalSearch plugin

The GlobalSearch plugin provides an easy way to search for various objects, such as applications
or dashboards from the Kibana instance, from both server and client-side plugins

## Consuming the globalSearch API

```ts
startDeps.globalSearch.find('some term').subscribe({
  next: ({ results }) => {
    addNewResultsToList(results);
  },
  error: () => {},
  complete: () => {
    showAsyncSearchIndicator(false);
  }
});
```

## Registering custom result providers

The GlobalSearch API allows to extend provided results by registering your own provider.

```ts
setupDeps.globalSearch.registerResultProvider({
  id: 'my_provider',
  find: (term, options, context) => {
    const resultPromise = myService.search(term, context.core.savedObjects.client);
    return from(resultPromise).pipe(takeUntil(options.aborted$);
  },
});
```

## Known limitations

### Client-side registered providers

Results from providers registered from the client-side `registerResultProvider` API will
not be available when performing a search from the server-side. For this reason, prefer
registering providers using the server-side API when possible.

Refer to the [RFC](rfcs/text/0011_global_search.md#result_provider_registration) for more details

### Search completion cause

There is currently no way to identify `globalSearch.find` observable completion cause:
searches completing because all providers returned all their results and searches
completing because the consumer aborted the search using the `aborted$` option or because
the internal timout period has been reaches will both complete the same way.
