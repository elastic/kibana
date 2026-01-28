# APM UI Metrics tab

When viewing a service in APM, the Metrics tab shows different things depending on the agent instrumenting the service.

See /x-pack/solutions/observability/plugins/apm/public/components/app/metrics/index.tsx.

## AWS Lambda

Lambda services render custom components in the Metrics tab.

## Static dashboards

The component uses `agent.name` and `telemetry.sdk.*` fields to determine if we have a static dashboard JSON file in the dashboards directory. If one of these matches, we load the JSON, set the data view values for each panel, and render an embedded dashboard onto the tab.

### Adding a new static dashboard

When adding a new static dashboard, if there are any panels on the dashboard that use ES|QL, you must replace the source used by all of the `FROM` (or `TS`, etc.) commands.

For example, if your dashboard was exported with `FROM metrics-apm*,apm-*`, this text must be replaced with `FROM {{indexPattern}}` in the dashboard JSON. The components in the tab will replace `{{indexPattern}}` with the current APM data view.

## JRuby (non-Lambda)

These services render custom JVM components in the Metrics tab.

## APM default fallback

If none of the above match, the service metrics for Elastic APM agents are rendered in the tab.
