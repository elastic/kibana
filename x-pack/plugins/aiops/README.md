# aiops

The plugin provides APIs and components for AIOps features, including the “Log rate analysis” UI, maintained by the ML team.

---

## Log Rate Analysis

Here's some notes on the structure of the code for the API endpoint `/internal/aiops/log_rate_analysis`. The endpoint uses the `@kbn/ml-response-stream` package to return the request's response as a HTTP stream of JSON objects. The files are located in `x-pack/plugins/aiops/server/routes/log_rate_analysis/`.

`define_route.ts:defineRoute()` is the outer most wrapper that's used to define the route and its versions. It calls `route_handler_factory:routeHandlerFactory()` for each version.

The route handler sets up `response_stream_factory:responseStreamFactory()` to create the response stream and then walks through the steps of the analysis.

The response stream factory acts as a wrapper to set up the stream itself, the stream state (for example to set if it's running etc.), some custom actions on the stream as well as analysis handlers that fetch data from ES and pass it on to the stream.

## Development

See the [kibana contributing guide](https://github.com/elastic/kibana/blob/main/CONTRIBUTING.md) for instructions setting up your development environment.
