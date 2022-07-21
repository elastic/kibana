# Routes patterns

Inside each handler file you should export:

* `method` that specifies the HTTP API method
* `handler` that specifies the handler function
* Any body, parameter or query schema definition for the route

In this way, the concerns of a specific endpoint or well encapsulated in a single
file and they can be assembled into a route later: this works really well for the
`<fileKind>` routes (see below) and we don't need to strictly follow this registration
pattern for other routes.

Routes under `<BASEPATH>/<fileKind>` are registered dynamically because we want
to consumers of files to specify a route-level configuration to explicitly allow
certain types of API actions against files.