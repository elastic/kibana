# Elastic Observability solution

The [packages](./packages) and [plugins](./plugins) for the [Elastic Observability solution](https://www.elastic.co/guide/en/observability/current/index.html) are located here.

## Using Elasticsearch field names

All code that references field names of data stored in Elasticsearch should import the names from the [@kbn/observability-ui-semantic-conventions](/x-pack/platform/packages/shared/kbn-observability-ui-semantic-conventions/README.md) package. This is the single source of truth for all fields used in all Observability apps.
