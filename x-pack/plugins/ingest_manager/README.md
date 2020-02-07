# Ingest Manager

## Getting started
See the Kibana docs for [how to set up your dev environment](https://github.com/elastic/kibana/blob/master/CONTRIBUTING.md#setting-up-your-development-environment), [run Elasticsearch](https://github.com/elastic/kibana/blob/master/CONTRIBUTING.md#running-elasticsearch), and [start Kibana](https://github.com/elastic/kibana/blob/master/CONTRIBUTING.md#running-kibana).

One common workflow is:

 1. `yarn es snapshot`
 1. In another shell: `yarn start --xpack.ingestManager.enabled=true` (or set in `config.yml`)

## HTTP API
  1. Nothing by default. If `xpack.ingestManager.enabled=true`, it adds the `DATASOURCE_API_ROUTES` and `AGENT_CONFIG_API_ROUTES` values in [`common/constants/routes.ts`](./common/constants/routes.ts)
  1. [Integration tests](../../test/api_integration/apis/ingest_manager/endpoints.ts)
  1. In later versions the EPM and Fleet routes will be added when their flags are enabled. See the [currently disabled logic to add those routes](https://github.com/jfsiii/kibana/blob/feature-ingest-manager/x-pack/plugins/ingest_manager/server/plugin.ts#L86-L90).

## Plugin architecture
Follows the `common`, `server`, `public` structure from the [Architecture Style Guide
](https://github.com/elastic/kibana/blob/master/style_guides/architecture_style_guide.md#file-and-folder-structure).

We use New Platform approach (structure, APIs, etc) where possible. There's a `kibana.json` manifest, and the server uses the `server/{index,plugin}.ts` approach from [`MIGRATION.md`](https://github.com/elastic/kibana/blob/master/src/core/MIGRATION.md#architecture). 