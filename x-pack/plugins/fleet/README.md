# Fleet

## Plugin

- The plugin is enabled by default. See the TypeScript type for the [the available plugin configuration options](https://github.com/elastic/kibana/blob/master/x-pack/plugins/fleet/common/types/index.ts#L9-L27)
- Adding `xpack.fleet.enabled=false` will disable the plugin including the EPM and Fleet features. It will also remove the `PACKAGE_POLICY_API_ROUTES` and `AGENT_POLICY_API_ROUTES` values in [`common/constants/routes.ts`](./common/constants/routes.ts)
- Adding `--xpack.fleet.agents.enabled=false` will disable the Fleet API & UI
  - [code for adding the routes](https://github.com/elastic/kibana/blob/1f27d349533b1c2865c10c45b2cf705d7416fb36/x-pack/plugins/ingest_manager/server/plugin.ts#L115-L133)
  - [Integration tests](server/integration_tests/router.test.ts)
- Both EPM and Fleet require `ingestManager` be enabled. They are not standalone features.
- For Enterprise license, a custom package registry URL can be used by setting `xpack.fleet.registryUrl=http://localhost:8080`
  - This property is currently only for internal Elastic development and is unsupported

## Fleet Requirements

Fleet needs to have Elasticsearch API keys enabled, and also to have TLS enabled on kibana, (if you want to run Kibana without TLS you can provide the following config flag `--xpack.fleet.agents.tlsCheckDisabled=false`)

Also you need to configure the hosts your agent is going to use to comunication with Elasticsearch and Kibana (Not needed if you use Elastic cloud). You can use the following flags:

```
--xpack.fleet.agents.elasticsearch.host=http://localhost:9200
--xpack.fleet.agents.kibana.host=http://localhost:5601
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
  yarn start --xpack.fleet.enabled=true --no-base-path
  ```

This plugin follows the `common`, `server`, `public` structure from the [Architecture Style Guide
](https://github.com/elastic/kibana/blob/master/style_guides/architecture_style_guide.md#file-and-folder-structure). We also follow the pattern of developing feature branches under your personal fork of Kibana.

Note: The plugin was previously named Ingest Manager it's possible that some variables are still named with that old plugin name.

### Running Fleet Server Locally in a Container

It can be useful to run Fleet Server in a container on your local machine in order to free up your actual "bare metal" machine to run Elastic Agent for testing purposes. Otherwise, you'll only be able to a single instance of Elastic Agent dedicated to Fleet Server on your local machine, and this can make testing integrations and policies difficult.

_The following is adapted from the Fleet Server [README](https://github.com/elastic/fleet-server#running-elastic-agent-with-fleet-server-in-container)_

1. Add the following configuration to your `kibana.dev.yml`

```yml
server.host: 0.0.0.0
```

2. Append the following option to the command you use to start Elasticsearch

```
-E http.host=0.0.0.0
```

This command should look something like this:

```
yarn es snapshot --license trial -E xpack.security.authc.api_key.enabled=true -E path.data=/tmp/es-data -E http.host=0.0.0.0
```

3. Run the Fleet Server Docker container. Make sure you include a `BASE-PATH` value if your local Kibana instance is using one. `YOUR-IP` should correspond to the IP address used by your Docker network to represent the host. For Windows and Mac machines, this should be `192.168.65.2`. If you're not sure what this IP should be, run the following to look it up:

```
docker run -it --rm alpine nslookup host.docker.internal
```

To run the Fleet Server Docker container:

```
docker run -e KIBANA_HOST=http://{YOUR-IP}:5601/{BASE-PATH} -e KIBANA_USERNAME=elastic -e KIBANA_PASSWORD=changeme -e ELASTICSEARCH_HOST=http://{YOUR-IP}:9200 -e ELASTICSEARCH_USERNAME=elastic -e ELASTICSEARCH_PASSWORD=changeme -e KIBANA_FLEET_SETUP=1 -e FLEET_SERVER_ENABLE=1 -e FLEET_SERVER_INSECURE_HTTP=1 -p 8220:8220 docker.elastic.co/beats/elastic-agent:{VERSION}
```

Ensure you provide the `-p 8220:8220` port mapping to map the Fleet Server container's port `8220` to your local machine's port `8220` in order for Fleet to communicate with Fleet Server.

For the latest version, use `8.0.0-SNAPSHOT`. Otherwise, you can explore the available versions at https://www.docker.elastic.co/r/beats/elastic-agent.

Once the Fleet Server container is running, you should be able to treat it as if it were a local process running on `http://localhost:8220` when configuring Fleet via the UI. You can then run `elastic-agent` on your local machine directly for testing purposes.

### Tests

#### API integration tests

You need to have `docker` to run ingest manager api integration tests

1. In one terminal, run the tests from the Kibana root directory with

   ```
   FLEET_PACKAGE_REGISTRY_PORT=12345 yarn test:ftr:server --config x-pack/test/fleet_api_integration/config.ts
   ```

1. in a second terminal, run the tests from the Kibana root directory with

   ```
   FLEET_PACKAGE_REGISTRY_PORT=12345 yarn test:ftr:runner --config x-pack/test/fleet_api_integration/config.ts
   ```

   Optionally you can filter which tests you want to run using `--grep`

   ```
   FLEET_PACKAGE_REGISTRY_PORT=12345 yarn test:ftr:runner --config x-pack/test/fleet_api_integration/config.ts --grep='fleet'
   ```

**Note** you can also supply which docker image to use for the package registry via the `FLEET_PACKAGE_REGISTRY_DOCKER_IMAGE` env variable. For example,

```
FLEET_PACKAGE_REGISTRY_DOCKER_IMAGE='docker.elastic.co/package-registry/distribution:production' FLEET_PACKAGE_REGISTRY_PORT=12345 yarn test:ftr:runner
```

