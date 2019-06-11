# The `infra` plugin

This is the home of the `infra` plugin, which aims to provide a solution for
the infrastructure monitoring use-case within Kibana.

## UI Structure

The plugin provides two main apps in Kibana - the *Infrastructure UI* and the
*Logs UI*. Both are reachable via their own main navigation items and via links
from other parts of Kibana.

The *Infrastructure UI* consists of three main screens, which are the
*Inventory*, the *Node details* and the *Metrics explorer*.

The *Logs UI* provides one log viewer screen.

## Communicating

In order to address the whole infrastructure monitoring team, the
@elastic/infra-logs-ui team alias can be used as a mention or in review
requests.

The [Infrastructure forum] and [Logs forum] on Discuss are frequented by the
team as well.

## Contributing

Since the `infra` plugin lives within the Kibana repository, [Kibana's
contribution procedures](../../../CONTRIBUTING.md) apply. In addition to that,
this section details a few plugin-specific aspects.

### Ingesting metrics

The *Infrastructure UI* displays [ECS]-compatible metric data from indices
matching the `metricbeat-*` pattern by default. The primary way to ingest these
is by running [Metricbeat] to deliver metrics to the development Elasticsearch
cluster. It can be used to ingest development host metrics using the `system`
module.

A setup that ingests docker and nginx metrics is described in
[./docs/test_setups/infra_metricbeat_docker_nginx.md].

### Ingesting logs

Similarly, the *Logs UI* assumes [ECS]-compatible log data to be present in
indices matching the `filebeat-*` pattern. At the time of writing the minimum
required fields are `@timestamp` and `message`, but the presence of other [ECS]
fields enable additional functionality such as linking to and from other
solutions.

The primary way to ingest such log data is via [Filebeat]. A convenient source
of log entries are the Kibana and Elasticsearch log files produced by the
development environment itself. These can easily be consumed by enabling the modules

```
$ filebeat modules enable elasticsearch
$ filebeat modules enable kibana
```

and then editing the `modules.d/elasticsearch.yml` and `modules.d/kibana.yml`
to change the `var.paths` settings to contain paths to the development
environment's log files, e.g.:

```
- module: elasticsearch
  server:
    enabled: true
    var.paths:
      - "${WORK_ENVIRONMENT}/kibana/.es/8.0.0/logs/elasticsearch_server.json"
    var.convert_timezone: true
```

### Creating PRs

To ensure that a newly created PR gets the attention of the
@elastic/infra-logs-ui team, the following label should be applied to PRs:

* `Infrastructure`
* `Infra UI` if it relates to the *Intrastructure UI*
* `Logs UI` if it relates to the *Logs UI*
* Version labels for backport targets

[Kibana's contribution procedures]: ../../../CONTRIBUTING.md
[Infrastructure forum]: https://discuss.elastic.co/c/infrastructure
[Logs forum]: https://discuss.elastic.co/c/logs
[ECS]: https://github.com/elastic/ecs/
[Metricbeat]: https://www.elastic.co/products/beats/metricbeat
[Filebeat]: https://www.elastic.co/products/beats/filebeat
