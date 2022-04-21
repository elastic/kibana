This document provides a general overview of the indices used by the Stack Monitoring UI.

## Index Patterns

Stack Monitoring indices will generally fall into to `.monitoring-*` index pattern with some variation depending on collection mode.

When using [internal collection](data_collection_modes.md#internal-collection), or standalone metricbeat collection prior to 8.0, data will be stored in dated raw indices following the pattern:

- `.monitoring-(component)-7-(date)`

When using [standalone metricbeat collection](data_collection_modes.md#standalone-metricbeat-collection) after 8.0, data will be stored in a data stream with the following pattern:

- `.monitoring-(component)-8-mb`

> Note that the distinction between 7 and 8 is the **data schema** version. These numbers are not expected to track stack release versions.

With the change to [package-driven collection](data_collection_modes.md#package-driven-collection), data will be stored in data streams under the `metrics-*` index pattern.

Additionally, in version 8.0 only, Enterprise Search metrics are published to the `metricbeat-*` index pattern. This was a bug and corrected in 8.1 ([kibana-pr2981](https://github.com/elastic/beats/pull/29871)).

And finally if using the standalone metricbeat modules with `xpack.enabled: false`, they will write data into the `metricbeat-*` index pattern. Stack Monitoring UI was never adapted to read this data, so it would only be available for custom dashboards. 

## Mapping sources

The index templates for `.monitoring-*` are shipped with and managed by Elasticsearch itself and can be found in that code repository. For example:

- [monitoring-es.json](https://github.com/elastic/elasticsearch/blob/master/x-pack/plugin/core/src/main/resources/monitoring-es.json) - for internal collection or standalone metricbeat prior to 8.0
- [monitoring-es-mb.json](https://github.com/elastic/elasticsearch/blob/master/x-pack/plugin/core/src/main/resources/monitoring-es-mb.json) - for standalone metricbeat after 8.0

To verify changes to these templates, either make them in place on a running cluster or run elasticsearch from source.

When updating the templates, it is important to increment the version number [here](https://github.com/elastic/elasticsearch/blob/main/x-pack/plugin/monitoring/src/main/java/org/elasticsearch/xpack/monitoring/MonitoringTemplateRegistry.java#L81). Elasticsearch uses this version number to decide if it should re-install the templates.
PRs should add the labels ":Data Management/Monitoring" and "Team:Data Management" to involve the right Elasticsearch members.
[Reference PR](https://github.com/elastic/elasticsearch/pull/85447)

The `metrics-*` and `metricbeat-*` mappings are managed by metricbeat and elastic agent. The mappings are created by metricbeat programmatically by combining the field definitions of all the contained modules.

## Fields

The best place to reference information for each field is in the metricbeat module documentation for each component.

- [Elasticsearch](https://github.com/elastic/beats/blob/main/metricbeat/module/elasticsearch/_meta/README.md)
- [Kibana](https://github.com/elastic/beats/blob/main/metricbeat/module/kibana/_meta/README.md)
- [Logstash](https://github.com/elastic/beats/blob/main/metricbeat/module/logstash/_meta/README.md)
- [Beat](https://github.com/elastic/beats/blob/main/metricbeat/module/beat/_meta/README.md) (\*beat, apm-server, fleet server)
- [Enterprise Search](https://github.com/elastic/beats/tree/main/x-pack/metricbeat/module/enterprisesearch/_meta/README.md)

## Aliasing

In order for the Stack Monitoring UI to function across multiple data schemas, aliases are added to newer indices to allow the original queries to continue to work.

For example, see [the alias for es cluster_uuid](https://github.com/elastic/elasticsearch/blob/91379ea21e7d987272ba49e385e74ec55a904d84/x-pack/plugin/core/src/main/resources/monitoring-es-mb.json#L2061-L2064).

In some cases aliases aren't sufficient due to the required query pattern. In these cases we add UI logic to accommodate both old and new schemas.