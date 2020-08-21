# Ingest Manager

## Plugin

- The plugin is enabled by default. See the TypeScript type for the [the available plugin configuration options](https://github.com/elastic/kibana/blob/master/x-pack/plugins/ingest_manager/common/types/index.ts#L9-L27)
- Adding `xpack.ingestManager.enabled=false` will disable the plugin including the EPM and Fleet features. It will also remove the `PACKAGE_POLICY_API_ROUTES` and `AGENT_POLICY_API_ROUTES` values in [`common/constants/routes.ts`](./common/constants/routes.ts)
- Adding `--xpack.ingestManager.fleet.enabled=false` will disable the Fleet API & UI
  - [code for adding the routes](https://github.com/elastic/kibana/blob/1f27d349533b1c2865c10c45b2cf705d7416fb36/x-pack/plugins/ingest_manager/server/plugin.ts#L115-L133)
  - [Integration tests](server/integration_tests/router.test.ts)
- Both EPM and Fleet require `ingestManager` be enabled. They are not standalone features.
- For Gold+ license, a custom package registry URL can be used by setting `xpack.ingestManager.registryUrl=http://localhost:8080`

## Fleet Requirements

Fleet needs to have Elasticsearch API keys enabled, and also to have TLS enabled on kibana, (if you want to run Kibana without TLS you can provide the following config flag `--xpack.ingestManager.fleet.tlsCheckDisabled=false`)

Also you need to configure the hosts your agent is going to use to comunication with Elasticsearch and Kibana (Not needed if you use Elastic cloud). You can use the following flags:

```
--xpack.ingestManager.fleet.elasticsearch.host=http://localhost:9200
--xpack.ingestManager.fleet.kibana.host=http://localhost:5601
```

## Development

### Getting started

See the Kibana docs for [how to set up your dev environment](https://github.com/elastic/kibana/blob/master/CONTRIBUTING.md#setting-up-your-development-environment), [run Elasticsearch](https://github.com/elastic/kibana/blob/master/CONTRIBUTING.md#running-elasticsearch), and [start Kibana](https://github.com/elastic/kibana/blob/master/CONTRIBUTING.md#running-kibana)

One common development workflow is:

- Bootstrap Kibana
  ```
  yarn kbn bootstrap
  ```
- Start Elasticsearch in one shell
  ```
  yarn es snapshot -E xpack.security.authc.api_key.enabled=true
  ```
- Start Kibana in another shell
  ```
  yarn start --xpack.ingestManager.enabled=true --no-base-path
  ```

This plugin follows the `common`, `server`, `public` structure from the [Architecture Style Guide
](https://github.com/elastic/kibana/blob/master/style_guides/architecture_style_guide.md#file-and-folder-structure). We also follow the pattern of developing feature branches under your personal fork of Kibana.

### Tests

#### API integration tests

You need to have `docker` to run ingest manager api integration tests

1. In one terminal, run the tests from the Kibana root directory with

   ```
   INGEST_MANAGEMENT_PACKAGE_REGISTRY_PORT=12345 yarn test:ftr:server --config x-pack/test/ingest_manager_api_integration/config.ts
   ```

1. in a second terminal, run the tests from the Kibana root directory with

   ```
   INGEST_MANAGEMENT_PACKAGE_REGISTRY_PORT=12345 yarn test:ftr:runner --config x-pack/test/ingest_manager_api_integration/config.ts
   ```

   Optionally you can filter which tests you want to run using `--grep`

   ```
   INGEST_MANAGEMENT_PACKAGE_REGISTRY_PORT=12345 yarn test:ftr:runner --config x-pack/test/ingest_manager_api_integration/config.ts --grep='fleet'
   ```
