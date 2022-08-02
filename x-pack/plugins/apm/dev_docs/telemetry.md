# APM Telemetry

In order to learn about our customers' usage and experience of APM, we collect
two types of telemetry, which we'll refer to here as "Data Telemetry" and
"Behavioral Telemetry."

This document will explain how they are collected and how to make changes to
them.

[The telemetry repository has information about accessing the clusters](https://github.com/elastic/telemetry#kibana-access).
Telemetry data is uploaded to the "xpack-phone-home" indices.

## Data Telemetry

Information that can be derived from a cluster's APM indices is queried and sent
to the telemetry cluster using the
[Usage Collection plugin](../../../../src/plugins/usage_collection/README.mdx).

During the APM server-side plugin's setup phase a
[Saved Object](https://www.elastic.co/guide/en/kibana/master/managing-saved-objects.html)
for APM telemetry is registered and a
[task manager](../../task_manager/README.md) task is registered and started.
The task periodically queries the APM indices and saves the results in the Saved
Object, and the usage collector periodically gets the data from the saved object
and uploads it to the telemetry cluster.

Once uploaded to the telemetry cluster, the data telemetry is stored in
`stack_stats.kibana.plugins.apm` in the xpack-phone-home index.

### Collect a new telemetry field

In order to collect a new telemetry field you need to add a task which performs the query that collects the data from the cluster.

All the available tasks are [here](https://github.com/elastic/kibana/blob/ba84602455671f0f6175bbc0fd2e8f302c60bbe6/x-pack/plugins/apm/server/lib/apm_telemetry/collect_data_telemetry/tasks.ts)

### Debug telemetry

The following endpoint will run the `apm-telemetry-task` which is responsible for collecting the telemetry data and once it's completed it will return the telemetry attributes.

```
GET /internal/apm/debug-telemetry
```

### Updating Data Telemetry Mappings

In order for fields to be searchable on the telemetry cluster, they need to be
added to the cluster's mapping. The mapping is defined in
[the telemetry repository's xpack-phone-home template](https://github.com/elastic/telemetry/blob/master/config/templates/xpack-phone-home.json).

The mapping for the telemetry data is here under `stack_stats.kibana.plugins.apm`.

The mapping used there corresponds with the the [`apmSchema`](../server/lib/apm_telemetry/schema.ts) object. The telemetry tooling parses this file to generate its schemas, so some operations in this file (like doing a `reduce` or `map` over an array of properties) will not work.

The `schema` property of the `makeUsageCollector` call in the [`createApmTelemetry` function](../server/lib/apm_telemetry/index.ts) contains the `apmSchema`.

When adding a task, the key of the task and the `took` properties need to be added under the `tasks` properties in the mapping, as when tasks run they report the time they took.

The queries for the stats are in the [collect data telemetry tasks](../server/lib/apm_telemetry/collect_data_telemetry/tasks.ts).

The collection tasks also use the [`APMDataTelemetry` type](../server/lib/apm_telemetry/types.ts) which also needs to be updated with any changes to the fields.

Running `node scripts/telemetry_check --fix` from the root Kibana directory will update the schemas which should automatically notify the Infra team when a pull request is opened so they can update the mapping in the telemetry clusters.

Running `node scripts/test/jest --updateSnapshot` from the `x-pack/plugins/apm` directory will update the
mappings snapshot used in the jest tests.

## Behavioral Telemetry

Behavioral telemetry is recorded with the ui_metrics and application_usage methods from the Usage Collection plugin.

Please fill this in with more details.
