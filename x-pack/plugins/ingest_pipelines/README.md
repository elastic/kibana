# Ingest Node Pipelines UI

## Summary
The `ingest_pipelines` plugin provides Kibana support for [Elasticsearch's ingest nodes](https://www.elastic.co/guide/en/elasticsearch/reference/master/ingest.html). Please refer to the Elasticsearch documentation for more details.

This plugin allows Kibana to create, edit, clone and delete ingest node pipelines. It also provides support to simulate a pipeline.

It requires a Basic license and the following cluster privileges: `manage_pipeline` and `cluster:monitor/nodes/info`.

---

## Development

A new app called Ingest Node Pipelines is registered in the Management section and follows a typical CRUD UI pattern. The client-side portion of this app lives in [public/application](public/application) and uses endpoints registered in [server/routes/api](server/routes/api).

See the [kibana contributing guide](https://github.com/elastic/kibana/blob/master/CONTRIBUTING.md) for instructions on setting up your development environment.

### Test coverage

The app has the following test coverage:

- Complete API integration tests
- Smoke-level functional test
- Client-integration tests
