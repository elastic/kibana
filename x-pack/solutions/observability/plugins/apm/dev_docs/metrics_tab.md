# APM UI Metrics tab

When viewing a service in APM, the Metrics tab shows different things depending on the agent instrumenting the service.

See /x-pack/solutions/observability/plugins/apm/public/components/app/metrics/index.tsx.

## AWS Lambda

Lambda services render custom components in the Metrics tab.

## Static dashboards

The component uses `agent.name` and `telemetry.sdk.*` fields to determine if we have a static dashboard JSON file in the dashboards directory. If one of these matches, we load the JSON, set the data view values for each panel, and render an embedded dashboard onto the tab.

## JRuby (non-Lambda)

These services render custom JVM components in the Metrics tab.

## APM default fallback

If none of the above match, the service metrics for Elastic APM agents are rendered in the tab.
