# Basic setups

## Yarn and internal collection

For the simplest Elasticsearch & Kibana stack monitoring setup from a kibana clone, using [internal collection](../reference/terminology.md#internal-collection), first start elasticsearch with monitoring and a local [exporter](https://www.elastic.co/guide/en/elasticsearch/reference/current/es-monitoring-exporters.html) enabled.

```shell
yarn es snapshot --license trial \
  -E xpack.monitoring.collection.enabled=true \ 
  -E xpack.monitoring.exporters.id0.type=local
```

Then start kibana:

```shell
yarn start
```

Open kibana and navigate to "Stack Monitoring" (sidebar, homepage, or search bar). You should see a page like this.

![Stack Monitoring overview page with Elasticsearch and Kibana panels using internal collection](../images/ek_internal_collection_overview.png)

This is definitely the simplest way to get some data to explore, but internal collection is a deprecated collection mode, so next we'll use metricbeat collection.

## Yarn and metricbeat collection

To set up stack monitoring with [metricbeat collection](../reference/terminology.md#metricbeat-collection), first start elasticsearch with a trial license.

```shell
yarn es snapshot --license trial
```

Next, we'll need to give kibana a fixed base url so metricbeat can query it. So add this to your `kibana.dev.yml` file:

```yml
server.basePath: '/ftw'
```

Then start kibana:

```shell
yarn start
```

Next start metricbeat. Any method of [installing metricbeat](https://www.elastic.co/guide/en/beats/metricbeat/current/metricbeat-installation-configuration.html) works fine. We'll use docker since it is a good common point regardless of your development OS.

```shell
docker run --name metricbeat \
  --pull always --rm \
  --hostname=metricbeat \
  --publish=5066:5066 \
  --volume="$(pwd)/x-pack/plugins/monitoring/dev_docs/reference/metricbeat.yarn.yml:/usr/share/metricbeat/metricbeat.yml:ro" \
  docker.elastic.co/beats/metricbeat:master-SNAPSHOT
```

## Filebeat for logs

Regardless of the metrics collection method, logs will get collected using filebeat.

Similar to metricbeat, any method of [installing filebeat](https://www.elastic.co/guide/en/beats/filebeat/current/filebeat-installation-configuration.html) works fine. We'll use docker again here as a good common point.

```shell
docker run --name filebeat \
  --pull always --rm \
  --hostname=filebeat \
  --publish=5067:5067 \
  --volume="$(pwd)/.es:/es:ro" \
  --volume="$(pwd)/x-pack/plugins/monitoring/dev_docs/reference/filebeat.yarn.yml:/usr/share/filebeat/filebeat.yml:ro" \
  docker.elastic.co/beats/filebeat:master-SNAPSHOT
```

## Standalone Cluster

The "[Standalone Cluster](../reference/terminology.md#standalone-cluster)" entry appears in Stack Monitoring when there are monitoring documents that lack a `cluster_uuid`. Beats will send these in some timing/failure cases, but the easiest way to generate them intentionally to start a logstash node with monitoring enabled and no elasticsearch output.

For example using docker and [metricbeat collection](#yarn-and-metricbeat-collection):

```shell
docker run --name logstash \
  --pull always --rm \
  --hostname=logstash \
  --publish=9600:9600 \
  --volume="$(pwd)/x-pack/plugins/monitoring/dev_docs/reference/logstash.yml:/usr/share/logstash/config/logstash.yml:ro" \
  docker.elastic.co/logstash/logstash:master-SNAPSHOT \
  -e 'input { java_generator { eps => 1 } } output { file { path => "/dev/null" } }'
```

# Complete docker setup

We also maintain an internal docker-compose setup for running a full stack with monitoring enabled for all components.

See (internal) https://github.com/elastic/observability-dev/tree/main/tools/docker-testing-cluster for more details.

# Complete source setup

For some types of changes (for example, new fields, templates, endpoints or data processing logic), you may want to run stack components from source.

See [Running Components from Source](running_components_from_source.md) for details on how to do this for each component.
