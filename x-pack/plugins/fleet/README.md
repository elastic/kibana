# Fleet

## Plugin

- The plugin is enabled by default. See the TypeScript type for the [the available plugin configuration options](https://github.com/elastic/kibana/blob/main/x-pack/plugins/fleet/common/types/index.ts#L9-L27)
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

See the Kibana docs for [how to set up your dev environment](https://github.com/elastic/kibana/blob/main/CONTRIBUTING.md#setting-up-your-development-environment), [run Elasticsearch](https://github.com/elastic/kibana/blob/main/CONTRIBUTING.md#running-elasticsearch), and [start Kibana](https://github.com/elastic/kibana/blob/main/CONTRIBUTING.md#running-kibana)

One common development workflow is:

- Bootstrap Kibana
  ```
  yarn kbn bootstrap
  ```
- Start Elasticsearch in one shell
  ```
  yarn es snapshot -E xpack.security.authc.api_key.enabled=true -E xpack.security.authc.token.enabled=true
  ```
- Start Kibana in another shell
  ```
  yarn start --xpack.fleet.enabled=true --no-base-path
  ```

This plugin follows the `common`, `server`, `public` structure from the [Architecture Style Guide
](https://github.com/elastic/kibana/blob/main/style_guides/architecture_style_guide.md#file-and-folder-structure). We also follow the pattern of developing feature branches under your personal fork of Kibana.

Note: The plugin was previously named Ingest Manager it's possible that some variables are still named with that old plugin name.

### Running Fleet Server Locally in a Container

It can be useful to run Fleet Server in a container on your local machine in order to free up your actual "bare metal" machine to run Elastic Agent for testing purposes. Otherwise, you'll only be able to a single instance of Elastic Agent dedicated to Fleet Server on your local machine, and this can make testing integrations and policies difficult.

_The following is adapted from the Fleet Server [README](https://github.com/elastic/fleet-server#running-elastic-agent-with-fleet-server-in-container)_

1. Add the following configuration to your `kibana.dev.yml`

```yml
server.host: 0.0.0.0
xpack.fleet.agents.enabled: true
xpack.fleet.packages:
  - name: fleet_server
    version: latest
xpack.fleet.agentPolicies:
  - name: Fleet Server policy
    id: fleet-server-policy
    description: Fleet server policy
    namespace: default
    package_policies:
      - name: Fleet Server
        package:
          name: fleet_server
```

2. Append the following option to the command you use to start Elasticsearch

```
-E http.host=0.0.0.0
```

This command should look something like this:

```
yarn es snapshot --license trial -E xpack.security.authc.api_key.enabled=true -E xpack.security.authc.token.enabled=true -E path.data=/tmp/es-data -E http.host=0.0.0.0
```

3. Run the Fleet Server Docker container. Make sure you include a `BASE-PATH` value if your local Kibana instance is using one. `YOUR-IP` should correspond to the IP address used by your Docker network to represent the host. For Windows and Mac machines, this should be `192.168.65.2`. If you're not sure what this IP should be, run the following to look it up:

```
docker run -it --rm alpine nslookup host.docker.internal
```

To run the Fleet Server Docker container:

```
docker run -e KIBANA_HOST=http://{YOUR-IP}:5601/{BASE-PATH} -e KIBANA_USERNAME=elastic -e KIBANA_PASSWORD=changeme -e ELASTICSEARCH_HOST=http://{YOUR-IP}:9200 -e KIBANA_FLEET_SETUP=1 -e FLEET_SERVER_ENABLE=1 -e FLEET_SERVER_POLICY_ID=fleet-server-policy -p 8220:8220 docker.elastic.co/beats/elastic-agent:{VERSION}
```

Ensure you provide the `-p 8220:8220` port mapping to map the Fleet Server container's port `8220` to your local machine's port `8220` in order for Fleet to communicate with Fleet Server.

For the latest version, use `8.0.0-SNAPSHOT`. Otherwise, you can explore the available versions at https://www.docker.elastic.co/r/beats/elastic-agent.

Once the Fleet Server container is running, you should be able to treat it as if it were a local process running on `https://localhost:8220` when configuring Fleet via the UI. You can then run `elastic-agent` on your local machine directly for testing purposes, or with Docker (recommended) see next section.

### Running Elastic Agent Locally in a Container (managed mode)

1. Create a new agent policy from the Fleet UI, by going to the Fleet app in Kibana > Agent policies > Add agent policy
2. Click "Add Agent"
3. Scroll down to the bottom of the flyout that opens to view the enrollment command, copy the contents of the `--enrollment-token` option
4. Run this docker command:
    ```
    docker run -e FLEET_ENROLL=true -e FLEET_INSECURE=true -e FLEET_URL=https://192.168.65.2:8220 -e FLEET_ENROLLMENT_TOKEN=<pasted from step 3> --rm docker.elastic.co/beats/elastic-agent:{VERSION}
    ```

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

### Storybook

Fleet contains [Storybook](https://storybook.js.org/) stories for developing UI components in isolation. To start the Storybook environment for Fleet, run the following from your `kibana` project root:

```sh
$ yarn storybook fleet
```

Write stories by creating `.stories.tsx` files colocated with the components you're working on. Consult the [Storybook docs](https://storybook.js.org/docs/react/get-started/introduction) for more information.

## Dependent applications using Fleet

The projects below are dependent on Fleet, most using Fleet API as well. In case of breaking changes in Fleet functionality/API, the project owners have to be notified to make sure they can plan for the necessary changes on their end to avoid unexpected break in functionality.

- [Elastic Agent](https://github.com/elastic/beats/blob/master/x-pack/elastic-agent): uses Fleet API to enroll agents. [Check here](https://github.com/elastic/beats/blob/master/x-pack/elastic-agent/pkg/agent/cmd/container.go)
- [Fleet Server](https://github.com/elastic/fleet-server): uses Fleet API to enroll fleet server [Check here](https://github.com/elastic/fleet-server/blob/master/cmd/fleet/router.go)
- [elastic-package](https://github.com/elastic/elastic-package): command line tool, uses Fleet with docker compose and Fleet API [Check here](https://github.com/elastic/elastic-package/tree/master/internal/kibana)
- [Azure VM extension](https://github.com/elastic/azure-vm-extension): automation tool for Azure VMs, uses Fleet API to enroll agents [Check here](https://github.com/elastic/azure-vm-extension/blob/main/src/handler/windows/scripts/enable.ps1)
- [e2e-testing](https://github.com/elastic/e2e-testing): internal project that runs Fleet and tests Fleet API [Check here](https://github.com/elastic/e2e-testing/tree/main/internal/kibana)
- [observability-test-environments](https://github.com/elastic/observability-test-environments): internal project, uses Fleet API [Check here](https://github.com/elastic/observability-test-environments/blob/master/ansible/tasks-fleet-config.yml)
- [ECK](https://github.com/elastic/cloud-on-k8s): Elastic Cloud on Kubernetes, orchestrates Elastic Stack applications, including Kibana with Fleet (no direct dependency, has examples that include Fleet config) [Check here](https://github.com/elastic/cloud-on-k8s/blob/main/docs/orchestrating-elastic-stack-applications/agent-fleet.asciidoc)
- [APM Server](https://github.com/elastic/apm-server) APM Server, receives data from Elastic APM agents. Using docker compose for testing. [Check here](https://github.com/elastic/apm-server/pull/7227/files)
- [APM Integration Testing](https://github.com/elastic/apm-integration-testing) APM integration testing. [Check here](https://github.com/elastic/apm-integration-testing/blob/53ec49f80bb8dc8175e21e9ac26452fa8c3b7cf0/docker/apm-server/managed/main.go#L188)

## Bundled Packages

Fleet supports shipping integrations as `.zip` archives with Kibana's source code through a concept referred to as _bundled packages_. This allows integrations like APM, which is enabled by default in Cloud, to reliably provide upgrade paths without internet access, and generally improves stability around Fleet's installation/setup processes for several common integrations.

The set of bundled packages included with Kibana is dictated by a top-level `fleet_packages.json` file in the Kibana repo. This file includes a list of packages with a pinned version that Kibana will consider bundled. When the Kibana distributable is built, a [build task](https://github.com/elastic/kibana/blob/main/src/dev/build/tasks/bundle_fleet_packages.ts) will resolve these packages from the Elastic Package Registry, download the appropriate version as a `.zip` archive, and place it in a directory configurable by a `xpack.fleet.bundledPackageLocation` value in `kibana.yml`. By default, these archives are stored in `x-pack/plugins/fleet/.target/bundled_packages/`. In CI/CD, we [override](https://github.com/elastic/kibana/blob/main/x-pack/test/fleet_api_integration/config.ts#L20) this default with `/tmp/fleet_bundled_packages`.

Until further automation is added, this `fleet_packages.json` file should be updated as part of the release process to ensure the latest compatible version of each bundled package is included with that Kibana version. **This must be done before the final BC for a release is built.**
Tracking issues should be opened and tracked by the Fleet UI team. See https://github.com/elastic/kibana/issues/129309 as an example.
