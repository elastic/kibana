# Server architecture and guidelines

Our Kibana Enterprise Search plugin has both a frontend, located in [public](public), and a server, located in [server](server). The server both serves the frontend, and acts as a middleware server between the frontend and Elasticsearch, Enterprise Search and any other backends the user may want to reach. That is: all calls to APIs are routed via Kibana.

These guidelines primarily deal with our API routes and how we've designed this architecture. Note that these are guidelines, not hard and fast rules, and can be deviated from if it makes sense.

## Architecture

On startup, [the plugin](server/plugin.ts) registers all API routes with the main Kibana server by calling a series of `registerRoute` functions. These functions can be found in [server/routes](server/routes) and are separated into [app_search](server/routes/app_search), [workplace_search](server/routes/workplace_search) and [enterprise_search](server/routes/enterprise_search) routes. The plugin provides the routes with a set of dependencies they can use, including the request and response objects as well as an Elasticsearch client.

### Endpoints
API endpoints are organized according to loosely applied RESTful principles. GET for fetching data, POST for creating new data, PUT for updating data. The main routes you'll likely be working with:

`enterprise_search`
- enterprise_search/analytics
- enterprise_search/crawler
- enterprise_search/connectors
- enterprise_search/indices

Endpoints should return and accept data in a JSON format using `snake_case` for property names. Any translation to and from `snake_case` should occur in the frontend. A notable allowed exception here is any endpoint calling the Enterprise Search Ruby app, as that app tends to accept `snake_case` but return `camelCase`.

### Routes

Each route path has its own file exporting a registerRoutes function, that's called by the plugin. For example, all `enterprise_search/indices` routes can be found in the [server/routes/enterprise_search/indices.ts](server/routes/enterprise_search/indices.ts) file.

Each of the route functions is wrapped in a generic handler. If the route is just a passthrough route to the Enterprise Search Ruby app, we use the [enterpriseSearchRequestHandler](server/lib/enterprise_search_request_handler.ts). If the route instead calls Elasticsearch APIs or does more than just pass through to Enterprise Search, we use the [elasticSearchErrorHandler](x-pack/plugins/enterprise_search/server/utils/elasticsearch_error_handler.ts) to provide consistent error handling.

Ideally, these route files do only two things: call a single library function to do the actual work we expect out of this endpoint, and handle any specific errors that don't fit into the generic error handler we use above. This minimalistic approach allows us to easily test whether the routes are calling the correct functions, and offload the actual logic to different places.

### Library functions
Each route that does more than just pass requests to Enterprise Search should have a single library function it can call that does the actual processing work. These library functions are located in [server/lib/] and should mirror the path of the routes, prefixing the filename with the HTTP verb. So a GET request to `enterprise_search/indices/{indexName}` should end up in a `getIndex` function, located in [server/lib/indices/get_index.ts](server/lib/indices/get_index.ts).

Where necessary for readability and/or to avoid duplicate code, these functions should call utility functions located in a `shared` folder in the nearest common parent directory. For example, a library function called by routes in just the `indices` directory should be located in [server/lib/indices/shared](server/lib/indices/shared), while a library function called by routes in both the `connectors` and `indices` directories should be located in [server/lib/shared](server/lib/shared).

Be careful when sharing functions across multiple routes: if you're adding many inputs to a single function, it's probably better to split them up and dedicate each to a single route, even if that means more duplicate code in the system. The added complexity caused by maintaining multiple code paths in a single function is generally not worth it.

### Types and validation

Endpoints validate their inputs using [@kbn/config-schema](/packages/kbn-config-schema/), and we share TypeScript types between the frontend and backend in [common/types](common/types) to facilitate consistent API expectation. A few hints:

- schema.maybe(...) allows the `...` to be optional/`undefined`.
- schema.nullable(...) allows the `...` to be `null`, which is distinct from making it optional or allowing `undefined`.
- Lean on `elasticsearch-js` (the built-in Elasticsearch client) types where possible to do the heavy lifting.

### Working with Elasticsearch and elasticsearch-js

Any Elasticsearch function should be available via the client, but it can be a bit hard to figure out what the required function name is. Because the (elasticsearch-js)[elasticsearch-js] documentation isn't great, a search through Kibana's codebase is often more efficient than trying to go through the docs.

The Kibana plugin provides an Elasticsearch client object to every route. You can access this client under the obvious name `client`. That client comes with two users you can use to perform actual Elasticsearch operations: `client.asCurrentUser` and `client.asInternalUser`. `asCurrentUser` will execute operations using the permissions attached to the incoming request, which should be the permissions of the user firing that request in Kibana. `asInternalUser` will execute requests as Kibana's internal user. This user has very limited permissions and is generally only useful if you want to manipulate Kibana's Saved Objects.

For most operations you'll want to specify a generic type argument to indicate the expected return type, as TypeScript has no way of knowing that type. See:

```
const connectorResult = await client.asCurrentUser.search<ReturnType>({
      from: accumulator.length,
      index,
      query,
      size: 1000,
    });
```

This will return a search object with each result document typed as the ReturnType specified in angle brankets.

### Atomic updates

When updating a document, you can use `client.asCurrentUser.update` to perform an atomic update.
```typescript
client.asCurrentUser.update({
  doc: { property_to_update: 'new value' },
  id: 'doc_id',
  index: 'indexName',
})
```
 This will replace the specified properties with the values you provide, while leaving unspecified properties untouched.

 If your requirements are more complicated, consider using [optimistic concurrency control](https://www.elastic.co/guide/en/elasticsearch/reference/current/optimistic-concurrency-control.html).


### Pagination

For consistency in pagination, we have a [Paginate<T>](common/types/pagination.ts) type that produces a paginated type, to be used in paginated results. This type works with Elastic EUI's paginated tables and provides a consistent interface for result types.

For pagination inputs, take a look at [fetch_sync_jobs.ts](server/lib/connectors/fetch_sync_jobs.ts). Generally speaking you'll want to specify at minimum a `size` and a `page` index.

### Testing

We should aim for 100% unit test coverage in the server, although you're allowed to deviate from that if the effort to get there doesn't make add much security. We have a longer-term roadmap item to add Kibana FTR configs for end-to-end tests so that we can run these against an actual Elasticsearch backend, but we don't have these yet.
