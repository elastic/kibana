Stack monitoring has three metrics collection modes:

- Previous standard, still supported: [Internal collection](#internal-collection)
- Current standard: [Standalone Metricbeat collection](#standalone-metricbeat-collection)
- Planned future standard: [Package-driven collection](#package-driven-collection)

And two log collection modes:

- Current standard: [Filebeat log collection](#logs-collection-filebeat)
- Planned future standard: [Package-driven collection](#package-driven-collection)

> **Note**: In the following sections "Beats" is used to refer to any stack component based on libbeat because the data collection modes are the same for any process in this group. This notably includes apm-server and fleet server.
 
## Metrics collection

### Internal collection

When using internal collection, each component in your Elastic stack will collect its own data via its own mechanism. In general this is an in-memory structure, but the implementation details vary per component.

On a cycle (typically 10 seconds), each stack component then typically publishes the internally collected metrics to the [production deployment](../reference/terminology.md#production-deployment).

Here's a diagram using kibana as an example. Other stack components have similar collection and publishing mechanisms.

```mermaid
graph TD
subgraph Production Deployment
  ProdElasticsearch[Elasticsearch]
end

subgraph Monitoring Deployment
  MonElasticsearch[Elasticsearch]
end

subgraph Kibana
  Collectors-.->|poll|Metrics[OS, Cgroups, etc]
  Collectors-.->|update|OpsMetricsObservable
  BulkUploader-.->|observe|OpsMetricsObservable
  
  click Collectors "https://github.com/elastic/kibana/tree/main/src/core/server/metrics/collectors"
  click OpsMetricsObservable "https://github.com/elastic/kibana/blob/92a8636f0ff63ab072527574e96e6616327b2ea4/src/core/server/metrics/metrics_service.ts#L32"
  click BulkUploader "https://github.com/elastic/kibana/blob/main/x-pack/plugins/monitoring/server/kibana_monitoring/bulk_uploader.ts"
end 

BulkUploader-->|/_monitoring/bulk|ProdElasticsearch
ProdElasticsearch-->|/_bulk|MonElasticsearch
```

The production cluster receives these metrics on the `/_monitoring/bulk` endpoint in elasticsearch, then forwards them to the [monitoring deployment](../reference/terminology.md#monitoring-deployment) along with its own metrics. Or writes them directly to disk if only using a single deployment.

Alternatively some stack components (logstash & beats) can be configured to send data directly to the [monitoring deployment](../reference/terminology.md#monitoring-deployment) either using a user-provided cluster UUID, or sending the data with no UUID to be associated with the [standalone cluster](../reference/terminology.md#standalone-cluster).

Here's an example from Logstash, which is capable of sending data directly to a monitoring deployment. It will associate the data with the UUID of any elasticsearch clusters found in the pipeline outputs.

```mermaid
graph LR
subgraph Logstash
  Pipeline-.->|output uuid|MonitoringExtension
  MonitoringExtension
  click MonitoringExtension "https://github.com/elastic/logstash/blob/main/x-pack/lib/monitoring/monitoring.rb"
end

subgraph Monitoring Deployment
  MonElasticsearch[Elasticsearch]
end
MonitoringExtension-->|_bulk|MonElasticsearch
```

### Standalone Metricbeat collection

When using standalone metricbeat collection, each component in your Elastic stack exposes an endpoint for metricbeat to collect metric data.

Each component has a corresponding metricbeat module that will read the endpoint and publish data directly to the [monitoring deployment](../reference/terminology.md#monitoring-deployment).

- [Elasticsearch](https://github.com/elastic/beats/tree/main/metricbeat/module/elasticsearch)
- [Kibana](https://github.com/elastic/beats/tree/main/metricbeat/module/kibana)
- [Logstash](https://github.com/elastic/beats/tree/main/metricbeat/module/logstash)
- [Beats](https://github.com/elastic/beats/tree/main/metricbeat/module/beat)
- [Enterprise Search](https://github.com/elastic/beats/tree/main/x-pack/metricbeat/module/enterprisesearch)

Here's an example using Elasticsearch. All other components implement similar HTTP endpoints and metricbeat modules.

```mermaid
graph LR
subgraph Production Elasticsearch
  ClusterStats["/_cluster/stats"]
  NodeStats["/_nodes/_local/stats"]
end

subgraph Monitoring Deployment
  MonElasticsearch[Elasticsearch]
end

subgraph Metricbeat
  ElasticsearchModule[Elasticsearch Module]
  click ElasticsearchModule "https://github.com/elastic/beats/tree/main/metricbeat/module/elasticsearch"
end

ElasticsearchModule-.->|poll|ClusterStats
ElasticsearchModule-.->|poll|NodeStats
ElasticsearchModule-->|/_bulk|MonElasticsearch
```

You can monitor many components from a single metricbeat process as is typically done during local development. You can also have a dedicated metricbeat process for each instance in a deployment as is done on ESS.

## Logs collection (Filebeat)

Regardless of the metrics collection mode, logs should always be collected using filebeat. Filebeat ships with a module for some stack components that can be used to collect the logs for that component.

- [Elasticsearch](https://github.com/elastic/beats/tree/main/filebeat/module/elasticsearch)
- [Kibana](https://github.com/elastic/beats/tree/main/filebeat/module/kibana)
- [Logstash](https://github.com/elastic/beats/tree/main/filebeat/module/logstash)
 
Stack Monitoring will read those same logs, as configured by the `monitoring.ui.logs.index` setting.

For example, in the case of the elasticsearch filebeat module reading slow query logs and writing to the corresponding pipeline on Elasticsearch:

```mermaid
graph LR
subgraph Production Elasticsearch
  SlowQueryLogs[*_index_search_slowlog.log]
end

subgraph Monitoring Deployment
  subgraph Elasticsearch
    Pipeline>filebeat-X.Y.Z-elasticsearch-slowlog-pipeline]
  end
end

subgraph Filebeat
  ElasticsearchModule[Elasticsearch Module]
end

Disk[(Disk)]
SlowQueryLogs-.->|write|Disk

ElasticsearchModule-.->|read|Disk
ElasticsearchModule-->|/_bulk|Pipeline
```

Enterprise Search doesn't have a filebeat module, but the logs can be ingested using the configuration found at https://github.com/elastic/ent-search-monitoring/blob/main/filebeat/filebeat.yml 

Beats also doesn't have filebeat module or recommended configuration, but the logs can be ingested using a basic JSON filebeat configuration.

## Unified collection

### Package-driven collection

When using package-driven collection, each component in your Elastic stack is given a corresponding fleet package (also known as "integration").

- [Elasticsearch](https://github.com/elastic/integrations/tree/main/packages/elasticsearch)
- [Kibana](https://github.com/elastic/integrations/tree/main/packages/kibana)
- [Logstash](https://github.com/elastic/integrations/tree/main/packages/logstash)
- Beats (WIP)
- Enterprise Search (WIP)

An operator will install the package via the monitoring deployment's kibana instance (or possible a separate deployment used for fleet management).

The [Elastic agents](https://github.com/elastic/elastic-agent) connected to [Fleet Server](https://github.com/elastic/fleet-server) then use the package configuration to collect metrics and logs from each component according to its requirements. This is likely similar to standalone metricbeat and filebeat and may use the same modules internally.

Over time the exact collection mechanism may change since it's an implementation detail of package-driven collection rather than something a user would have to manually configure.

Here an example using the elasticsearch package to collect logs and metrics from elasticsearch:

```mermaid
graph LR

subgraph Production Elasticsearch
  ClusterStats["/_cluster/stats"]
  SlowQueryLogs
end

subgraph Monitoring Deployment
  Elasticsearch
  Kibana
  EsPackage((ES Package))-->|install|Kibana
  FleetServer[Fleet Server]-->|read policies|Kibana
  Kibana-->|templates, dashboards, etc.|Elasticsearch
  
  click EsPackage "https://github.com/elastic/integrations/tree/main/packages/elasticsearch"
  click FleetServer "https://github.com/elastic/fleet-server"
end

Disk[(Disk)]
SlowQueryLogs-.->|write|Disk

subgraph Elastic Agent
  configuration
  metrics>metrics]
  logs>logs]
  publisher[publisher]
end

FleetServer-.->configuration

metrics-.->|poll|ClusterStats
logs-.->|read|Disk

publisher-->|/_bulk|Elasticsearch
```