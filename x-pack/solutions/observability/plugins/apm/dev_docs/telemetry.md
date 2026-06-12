# APM Telemetry

In order to learn about our customers' usage and experience of APM, we collect
two types of telemetry, which we'll refer to here as "Data Telemetry" and
"Behavioral Telemetry."

This document will explain how they are collected and how to make changes to
them.

[The telemetry repository has information about accessing the clusters](https://github.com/elastic/telemetry#i-just-want-to-see-the-data).
Telemetry data is uploaded to the "xpack-phone-home" indices.

## Data Telemetry

Information that can be derived from a cluster's APM indices is queried and sent
to the telemetry cluster using the
[Usage Collection plugin](../../../../../src/platform/plugins/shared/usage_collection/README.mdx).

During the APM server-side plugin's setup phase a
[Saved Object](https://www.elastic.co/guide/en/kibana/master/managing-saved-objects.html)
for APM telemetry is registered and a
[task manager](../../../task_manager/README.md) task is registered and started.
The task periodically queries the APM indices and saves the results in the Saved
Object, and the usage collector periodically gets the data from the saved object
and uploads it to the telemetry cluster.

Once uploaded to the telemetry cluster, the data telemetry is stored in
`stack_stats.kibana.plugins.apm` in the xpack-phone-home index.

### Collect a new telemetry field

In order to collect a new telemetry field you need to add a task which performs the query that collects the data from the cluster.

All the available tasks are [here](https://github.com/elastic/kibana/blob/main/x-pack/solutions/observability/plugins/apm/server/lib/apm_telemetry/collect_data_telemetry/tasks.ts)

### Debug telemetry

The following endpoint will run the `apm-telemetry-task` which is responsible for collecting the telemetry data and once it's completed it will return the telemetry attributes.

```
GET /internal/apm/debug-telemetry
```

### Updating Data Telemetry Mappings

In order for fields to be searchable on the telemetry cluster, they need to be
added to the cluster's mapping. The mapping is defined in
[the telemetry repository's xpack-phone-home template](https://github.com/elastic/telemetry/blob/main/legacy/config/templates/xpack-phone-home.json).

The mapping for the telemetry data is here under `stack_stats.kibana.plugins.apm`.

The mapping used there corresponds with the the [`apmSchema`](../server/lib/apm_telemetry/schema.ts) object. The telemetry tooling parses this file to generate its schemas, so some operations in this file (like doing a `reduce` or `map` over an array of properties) will not work.

The `schema` property of the `makeUsageCollector` call in the [`createApmTelemetry` function](../server/lib/apm_telemetry/index.ts) contains the `apmSchema`.

When adding a task, the key of the task and the `took` properties need to be added under the `tasks` properties in the mapping, as when tasks run they report the time they took.

The queries for the stats are in the [collect data telemetry tasks](../server/lib/apm_telemetry/collect_data_telemetry/tasks.ts).

The collection tasks also use the [`APMDataTelemetry` type](../server/lib/apm_telemetry/types.ts) which also needs to be updated with any changes to the fields.

Running `node scripts/telemetry_check --fix` from the root Kibana directory will update the schemas which should automatically notify the Infra team when a pull request is opened so they can update the mapping in the telemetry clusters.

Running `node scripts/test/jest --updateSnapshot` from the `x-pack/solutions/observability/plugins/apm` directory will update the
mappings snapshot used in the jest tests.

## Behavioral Telemetry

Behavioral telemetry is recorded with the ui_metrics and application_usage methods from the Usage Collection plugin.

Please fill this in with more details.

## Event based telemetry

Event-based telemetry (EBT) allows sending raw or minimally prepared data to the telemetry endpoints.

EBT is part of the core analytics service in Kibana and the `TelemetryService` provides an easy way to track custom events that are specific to `APM`.

#### Collect a new event type

1. You need to define the event type in the [telemetry_events.ts](https://github.com/elastic/kibana/blob/main/x-pack/solutions/observability/plugins/apm/public/services/telemetry/telemetry_events.ts#L36)
2. Define the tracking method in the [telemetry_client.ts](https://github.com/elastic/kibana/blob/main/x-pack/solutions/observability/plugins/apm/public/services/telemetry/telemetry_client.ts#L18)
3. Use the tracking method with the telemetry client (`telemetry.reportSearchQuerySumbitted({property: test})`)

In addition to the custom properties, analytics module automatically sends context properties. The list of the properties can be found [here](https://docs.elastic.dev/telemetry/collection/event-based-telemetry-context#browser-context)

#### How to check the events

In development, the events are sent to staging telemetry every hour and these events are stored in the `ebt-kibana-browser` dataview.

For instance, you can use a query like the following as an example to filter the apm event Search Query Submitted.

```
context.applicationId : "apm" and event_type : "Search Query Submitted"
```
