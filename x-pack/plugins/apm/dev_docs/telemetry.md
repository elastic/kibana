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
[Usage Collection plugin](../../../../src/plugins/usage_collection/README.md).

During the APM server-side plugin's setup phase a
[Saved Object](https://www.elastic.co/guide/en/kibana/master/managing-saved-objects.html)
for APM telemetry is registered and a
[task manager](../../task_manager/server/README.md) task is registered and started.
The task periodically queries the APM indices and saves the results in the Saved
Object, and the usage collector periodically gets the data from the saved object
and uploads it to the telemetry cluster.

Once uploaded to the telemetry cluster, the data telemetry is stored in
`stack_stats.kibana.plugins.apm` in the xpack-phone-home index.

### Generating sample data

The script in `scripts/upload-telemetry-data` can generate sample telemetry data and upload it to a cluster of your choosing.

You'll need to set the `GITHUB_TOKEN` environment variable to a token that has `repo` scope so it can read from the
[elastic/telemetry](https://github.com/elastic/telemetry) repository. (You probably have a token that works for this in
~/.backport/config.json.)

The script will run as the `elastic` user using the elasticsearch hosts and password settings from the config/kibana.yml
and/or config/kibana.dev.yml files.

Running the script with `--clear` will delete the index first.

After running the script you should see sample telemetry data in the "xpack-phone-home" index.

### Updating Data Telemetry Mappings

In order for fields to be searchable on the telemetry cluster, they need to be
added to the cluster's mapping. The mapping is defined in
[the telemetry repository's xpack-phone-home template](https://github.com/elastic/telemetry/blob/master/config/templates/xpack-phone-home.json).

The mapping for the telemetry data is here under `stack_stats.kibana.plugins.apm`.

The mapping used there can be generated with the output of the [`getTelemetryMapping`](../common/apm_telemetry.ts) function.

To make a change to the mapping, edit this function, run the tests to update the snapshots, then use the `merge_telemetry_mapping` script to merge the data into the telemetry repository.

If the [telemetry repository](https://github.com/elastic/telemetry) is cloned as a sibling to the kibana directory, you can run the following from x-pack/plugins/apm:

```bash
node ./scripts/merge-telemetry-mapping.js ../../../../telemetry/config/templates/xpack-phone-home.json
```

this will replace the contents of the mapping in the repository checkout with the updated mapping. You can then [follow the telemetry team's instructions](https://github.com/elastic/telemetry#mappings) for opening a pull request with the mapping changes.

## Behavioral Telemetry

Behavioral telemetry is recorded with the ui_metrics and application_usage methods from the Usage Collection plugin.

Please fill this in with more details.
