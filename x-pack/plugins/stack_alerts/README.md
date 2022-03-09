# stack_alerts plugin

This plugin provides alertTypes shipped with Kibana for use with the
[the alerting plugin](../alerting/README.md).  When enabled, it will register
the alertTypes by the Stack in the alerting plugin, register associated HTTP
routes, etc.

The plugin `setup` and `start` contracts for this plugin are the following
type, which provides some runtime capabilities.  Each built-in alertType will
have it's own top-level property in the `IService` interface, if it needs to
expose functionality.

```ts
export interface IService {
  indexThreshold: {
     timeSeriesQuery(params: TimeSeriesQueryParameters): Promise<TimeSeriesResult>;
  }
}
```

Each Stack RuleType is described in it's own README:

- index threshold: [`server/alert_types/index_threshold`](server/alert_types/index_threshold/README.md)
