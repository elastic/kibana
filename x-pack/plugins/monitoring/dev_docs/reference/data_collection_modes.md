Stack monitoring has three metrics collection modes:

- Previous standard, still supported: [Internal collection](#internal-collection)
- Current standard: [Standalone Metricbeat collection](#standalone-metricbeat-collection)
- Planned future standard: [Package-driven collection](#package-driven-collection)

And two log collection modes:

- Current standard: [Filebeat log collection](#filebeat-log-collection)
- Planned future standard: [Package-driven collection](#package-collection)

## Metrics collection

### Internal collection

When using internal collection, each component in your Elastic stack will collect its own data via its own mechanism. In general this is an in-memory structure, but the implementation details vary per component.

On a cycle (typically 10 seconds), each stack component then typically publishes the internally collected metrics to the [production deployment](../reference/terminology.md#production-deployment).

The production cluster receives these metrics on the `/_monitoring/bulk` endpoint in elasticsearch, then forwards them to the [monitoring deployment](../reference/terminology.md#monitoring-deployment) along with its own metrics.

Alternatively some stack components (logstash & beats) can be configured to send data directly to the [monitoring deployment](../reference/terminology.md#monitoring-deployment) either using a user-provided cluster UUID, or sending the data with no UUID to be associated with the [standalone cluster](../reference/terminology.md#standalone-cluster).

### Standalone Metricbeat collection

When using metricbeat collection, each component in your Elastic stack exposes an endpoint for metricbeat to collect metric data.

Each component has a corresponding metricbeat module that will read the endpoint and publish data directly to the [monitoring deployment](../reference/terminology.md#monitoring-deployment).

- [Elasticsearch](https://github.com/elastic/beats/tree/main/metricbeat/module/elasticsearch)
- [Kibana](https://github.com/elastic/beats/tree/main/metricbeat/module/kibana)
- [Logstash](https://github.com/elastic/beats/tree/main/metricbeat/module/logstash)
- [Beats](https://github.com/elastic/beats/tree/main/metricbeat/module/beat)
- [Enterprise Search](https://github.com/elastic/beats/tree/main/x-pack/metricbeat/module/enterprisesearch)

## Logs collection

Regardless of the metrics collection mode, logs should always be collected using filebeat. Filebeat ships with a module for some stack components that can be used to collect the logs for that component.

- [Elasticsearch](https://github.com/elastic/beats/tree/main/filebeat/module/elasticsearch)
- [Kibana](https://github.com/elastic/beats/tree/main/filebeat/module/kibana)
- [Logstash](https://github.com/elastic/beats/tree/main/filebeat/module/logstash)
 
Stack Monitoring will read those same logs, as configured by the `monitoring.ui.logs.index` setting.

Beats and Enterprise Search don't have filebeat modules, but the logs can be ingested using basic JSON filebeat configurations.

## Unified collection

### Package-driven collection

When using package-driven collection, each component in your Elastic stack is given a corresponding fleet package (also known as "integration").

The Elastic agents connected to fleet then using the integration data to collect metrics from each component according to its requirements. This is likely similar to standalone metricbeat and filebeat and may use those modules internally.

Over time the exact collection mechanism may change since it's an implementation detail of package-driven collection rather than something a user would have to manually configure.