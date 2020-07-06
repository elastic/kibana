# Ingest Manager

## Plugin

- The plugin is disabled by default. See the TypeScript type for the [the available plugin configuration options](https://github.com/elastic/kibana/blob/master/x-pack/plugins/ingest_manager/common/types/index.ts#L9-L27)
- Setting `xpack.ingestManager.enabled=true` enables the plugin including the EPM and Fleet features. It also adds the `PACKAGE_CONFIG_API_ROUTES` and `AGENT_CONFIG_API_ROUTES` values in [`common/constants/routes.ts`](./common/constants/routes.ts)
- Adding `--xpack.ingestManager.epm.enabled=false` will disable the EPM API & UI
- Adding `--xpack.ingestManager.fleet.enabled=false` will disable the Fleet API & UI
  - [code for adding the routes](https://github.com/elastic/kibana/blob/1f27d349533b1c2865c10c45b2cf705d7416fb36/x-pack/plugins/ingest_manager/server/plugin.ts#L115-L133)
  - [Integration tests](server/integration_tests/router.test.ts)
- Both EPM and Fleet require `ingestManager` be enabled. They are not standalone features.

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

### API Tests

#### Ingest & Fleet

1. In one terminal, change to the `x-pack` directory and start the test server with

   ```
   node scripts/functional_tests_server.js --config test/api_integration/config.ts
   ```

1. in a second terminal, run the tests from the Kibana root directory with
   ```
   node scripts/functional_test_runner.js --config x-pack/test/api_integration/config.ts
   ```

#### EPM

1. In one terminal, change to the `x-pack` directory and start the test server with

   ```
   node scripts/functional_tests_server.js --config test/epm_api_integration/config.ts
   ```

1. in a second terminal, run the tests from the Kibana root directory with
   ```
   node scripts/functional_test_runner.js --config x-pack/test/epm_api_integration/config.ts
   ```

### Staying up-to-date with `master`

While we're developing in the `feature-ingest` feature branch, here's is more information on keeping up to date with upstream kibana.

<details>
  <summary>merge upstream <code>master</code> into <code>feature-ingest</code></summary>

```bash
## checkout feature branch to your fork
git checkout -B feature-ingest origin/feature-ingest

## make sure your feature branch is current with upstream feature branch
git pull upstream feature-ingest

## pull in changes from upstream master
git pull upstream master

## push changes to your remote
git push origin

# /!\ Open a DRAFT PR /!\
# Normal PRs will re-notify authors of commits already merged
# Draft PR will trigger CI run. Once CI is green ...
# /!\ DO NOT USE THE GITHUB UI TO MERGE THE PR /!\

## push your changes to upstream feature branch from the terminal; not GitHub UI
git push upstream
```

</details>

See https://github.com/elastic/kibana/pull/37950 for an example.
