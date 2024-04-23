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

Fleet needs to have Elasticsearch API keys enabled.

Also you need to configure the hosts your agent is going to use to comunication with Elasticsearch and Kibana (Not needed if you use Elastic cloud). You can use the following flags:

```
--xpack.fleet.agents.elasticsearch.host=http://localhost:9200
--xpack.fleet.agents.kibana.host=http://localhost:5601
```

## Development

### Getting started

See the [Contributing to Kibana documentation](https://github.com/elastic/kibana/blob/main/CONTRIBUTING.md) or head straight to the [Kibana Developer Guide](https://docs.elastic.dev/kibana-dev-docs/getting-started/welcome) for setting up your dev environment, run Elasticsearch and start Kibana.

This plugin follows the `common`, `server`, `public` structure described in the [Kibana Developer Guide](https://docs.elastic.dev/kibana-dev-docs/key-concepts/platform-intro). Refer to [The anatomy of a plugin](https://docs.elastic.dev/kibana-dev-docs/key-concepts/anatomy-of-a-plugin) in the guide for further details.

We follow the pattern of developing feature branches under your personal fork of Kibana. Refer to [Set up a Development Environment](https://docs.elastic.dev/kibana-dev-docs/getting-started/setup-dev-env) in the guide for further details. Other best practices including developer principles, standards and style guide can be found under the Contributing section of the guide.

Note: The plugin was previously named Ingest Manager, it's possible that some variables are still named with that old plugin name.

#### Dev environment setup

These are some additional recommendations to the steps detailed in the [Kibana Developer Guide](https://docs.elastic.dev/kibana-dev-docs/getting-started/setup-dev-env).

Note: this section details how to run Kibana in stateful mode. For serverless development, see the [Developing Kibana in serverless mode](dev_docs/developing_kibana_and_fleet_server.md) guide.

1. Create a `config/kibana.dev.yml` file by copying the existing `config/kibana.yml` file.
2. It is recommended to explicitly set a base path for Kibana (refer to [Considerations for basepath](https://www.elastic.co/guide/en/kibana/current/development-basepath.html) for details). To do this, add the following to your `kibana.dev.yml`:

```yml
server.basePath: /<yourPath>
```

where `yourPath` is a path of your choice (e.g. your name).

3. Bootstrap Kibana:

```bash
yarn kbn bootstrap
```

#### Running Elasticsearch and Kibana

- Start Elasticsearch in one shell (NB: you might want to add other flags to enable data persistency and/or running Fleet Server locally, see below):
  ```
  yarn es snapshot -E xpack.security.authc.api_key.enabled=true -E xpack.security.authc.token.enabled=true
  ```
- Start Kibana in another shell:
  ```
  yarn start
  ```
  If you don't have a base path set up, add `--no-base-path` to `yarn start`.

#### Useful tips

To avoid the enforcing of version headers when running in dev mode, add the following to your `kibana.dev.yml`:

```
server.versioned.versionResolution: oldest
```
This will provide a default version for the public apis.


If Kibana fails to start, it is possible that your local setup got corrupted. An easy fix is to run:

```
yarn kbn clean && yarn kbn bootstrap
```

To avoid losing all your data when you restart Elasticsearch, you can provide a path to store the data when running the `yarn es snapshot ` command, e.g.:

```
-E path.data=/tmp/es-data
```

Refer to the [Running Elasticsearch during development](https://www.elastic.co/guide/en/kibana/current/running-elasticsearch.html) page of the guide for other options.

### Running Fleet Server Locally in a Container

It can be useful to run Fleet Server in a container on your local machine in order to free up your actual "bare metal" machine to run Elastic Agent for testing purposes. Otherwise, you'll only be able to a single instance of Elastic Agent dedicated to Fleet Server on your local machine, and this can make testing integrations and policies difficult.

Note: if you need to do simultaneous Kibana and Fleet Server development, refer to the [Developing Kibana and Fleet Server simulatanously](dev_docs/developing_kibana_and_fleet_server.md) guide.

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

Explore the available versions at https://www.docker.elastic.co/r/beats/elastic-agent. Only released versions are shown by default: tick the `Include snapshots` checkbox to see the latest version, e.g. `8.8.0-SNAPSHOT`.

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

#### Unit tests

Kibana primarily uses Jest for unit testing. Each plugin or package defines a `jest.config.js` that extends a preset provided by the `@kbn/test` package. Unless you intend to run all unit tests within the project, you should provide the Jest configuration for Fleet. The following command runs all Fleet unit tests:

```
yarn jest --config x-pack/plugins/fleet/jest.config.js
```

You can also run a specific test by passing the filepath as an argument, e.g.:

```
yarn jest --config x-pack/plugins/fleet/jest.config.js x-pack/plugins/fleet/common/services/validate_package_policy.test.ts
```

#### API integration tests (stateful)

API integration tests are run using the functional test runner (FTR). When developing or troubleshooting tests, it is convenient to run the server and tests separately as detailed below.

Note: Docker needs to be running to run these tests.

1. In one terminal, run the server from the Kibana root directory with

   ```
   FLEET_PACKAGE_REGISTRY_PORT=12345 yarn test:ftr:server --config x-pack/test/fleet_api_integration/<configFile>
   ```
   where `configFile` is the relevant config file relevant from the following:
   - config.agent.ts
   - config.agent_policy.ts
   - config.epm.ts
   - config.fleet.ts
   - config.package_policy.ts

1. In a second terminal, run the tests from the Kibana root directory with

   ```bash
   FLEET_PACKAGE_REGISTRY_PORT=12345 yarn test:ftr:runner --config x-pack/test/fleet_api_integration/<configFile>
   ```

   Optionally, you can filter which tests you want to run using `--grep`

   ```bash
   FLEET_PACKAGE_REGISTRY_PORT=12345 yarn test:ftr:runner --config x-pack/test/fleet_api_integration/<configFile> --grep='fleet'
   ```

Note: you can also supply which Docker image to use for the Package Registry via the `FLEET_PACKAGE_REGISTRY_DOCKER_IMAGE` env variable. For example,

```bash
FLEET_PACKAGE_REGISTRY_DOCKER_IMAGE='docker.elastic.co/package-registry/distribution:production' FLEET_PACKAGE_REGISTRY_PORT=12345 yarn test:ftr:runner
```

#### API integration tests (serverless)

The process for running serverless API integration tests is similar as above. Security and observability project types have Fleet enabled. At the time of writing, the same tests exist for Fleet under these two project types.

Security:
```bash
FLEET_PACKAGE_REGISTRY_PORT=12345 yarn test:ftr:server --config x-pack/test_serverless/api_integration/test_suites/security/fleet/config.ts
FLEET_PACKAGE_REGISTRY_PORT=12345 yarn test:ftr:runner --config  x-pack/test_serverless/api_integration/test_suites/security/fleet/config.ts
```

Observability:
```bash
FLEET_PACKAGE_REGISTRY_PORT=12345 yarn test:ftr:server --config x-pack/test_serverless/api_integration/test_suites/observability/fleet/config.ts
FLEET_PACKAGE_REGISTRY_PORT=12345 yarn test:ftr:runner --config  x-pack/test_serverless/api_integration/test_suites/observability/fleet/config.ts
```

#### Cypress tests

We support UI end-to-end testing with Cypress. Refer to [cypress/README.md](./cypress/README.md) for how to run these tests.

#### Jest integration tests

Some features need to test different Kibana configuration, test with multiple Kibana instances, ... For this purpose, Jest integration tests can be used, which allow starting ES and Kibana as required for each test

To run these tests `docker` needs to be running on your environment.

You can run the tests with the following commands:

```bash
node scripts/jest_integration.js x-pack/plugins/fleet/server/integration_tests/<YOUR_TEST_FILE>
```

You could also use node debugger to inspect ES indices (add the `debugger` directive in your test)

```bash
node --inspect scripts/jest_integration.js x-pack/plugins/fleet/server/integration_tests/<YOUR_TEST_FILE>
```

However, these tests are slow and harder to maintain. Therefore, we should try to avoid them and use API integration tests instead whenever possible.

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

As part of the bundled package update process, we'll likely also need to update the pinned Docker image that runs in Kibana's test environment. We configure this pinned registry image in

- `x-pack/test/fleet_api_integration/config.ts`
- `x-pack/plugins/fleet/server/integration_tests/helpers/docker_registry_helper.ts`
- `x-pack/test/functional/config.base.js`

To update this registry image, pull the digest SHA from the package storage Jenkins pipeline at https://beats-ci.elastic.co/blue/organizations/jenkins/Ingest-manager%2Fpackage-storage/activity and update the files above. The digest value should appear in the "publish Docker image" step as part of the `docker push` command in the logs.

![image](https://user-images.githubusercontent.com/6766512/171409455-64f9ab1d-08fe-4872-9b74-58359ed938dd.png)
