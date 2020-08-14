# Documentation for APM UI developers

### Setup local environment

#### Kibana

```
git clone git@github.com:elastic/kibana.git
cd kibana/
yarn kbn bootstrap
yarn start --no-base-path
```

#### APM Server, Elasticsearch and data

To access an elasticsearch instance that has live data you have two options:

##### A. Connect to Elasticsearch on Cloud (internal devs only)

Find the credentials for the cluster [here](https://github.com/elastic/apm-dev/blob/master/docs/credentials/apm-ui-clusters.md#apmelstcco)

##### B. Start Elastic Stack and APM data generators

```
git clone git@github.com:elastic/apm-integration-testing.git
cd apm-integration-testing/
./scripts/compose.py start master --all --no-kibana
```

_Docker Compose is required_

### E2E (Cypress) tests

```sh
x-pack/plugins/apm/e2e/run-e2e.sh
```

_Starts Kibana (:5701), APM Server (:8201) and Elasticsearch (:9201). Ingests sample data into Elasticsearch via APM Server and runs the Cypress tests_

### Unit testing

Note: Run the following commands from `kibana/x-pack/plugins/apm`.

#### Run unit tests

```
npx jest --watch
```

#### Update snapshots

```
npx jest --updateSnapshot
```

#### Coverage

HTML coverage report can be found in target/coverage/jest after tests have run.

```
open target/coverage/jest/index.html
```

### Functional tests

**Start server**

```
node scripts/functional_tests_server --config x-pack/test/functional/config.js
```

**Run tests**

```
node scripts/functional_test_runner --config x-pack/test/functional/config.js --grep='APM specs'
```

APM tests are located in `x-pack/test/functional/apps/apm`.
For debugging access Elasticsearch on http://localhost:9220` (elastic/changeme)

### API integration tests

Our tests are separated in two suites: one suite runs with a basic license, and the other
with a trial license (the equivalent of gold+). This requires separate test servers and test runners.

**Basic**

```
# Start server
node scripts/functional_tests_server --config x-pack/test/apm_api_integration/basic/config.ts

# Run tests
node scripts/functional_test_runner --config x-pack/test/apm_api_integration/basic/config.ts
```

The API tests for "basic" are located in `x-pack/test/apm_api_integration/basic/tests`.

**Trial**

```
# Start server
node scripts/functional_tests_server --config x-pack/test/apm_api_integration/trial/config.ts

# Run tests
node scripts/functional_test_runner --config x-pack/test/apm_api_integration/trial/config.ts
```

The API tests for "trial" are located in `x-pack/test/apm_api_integration/trial/tests`.

For debugging access Elasticsearch on http://localhost:9220` (elastic/changeme)

### Linting

_Note: Run the following commands from `kibana/`._

#### Prettier

```
yarn prettier  "./x-pack/plugins/apm/**/*.{tsx,ts,js}" --write
```

#### ESLint

```
yarn eslint ./x-pack/plugins/apm --fix
```

### Setup default APM users

APM behaves differently depending on which the role and permissions a logged in user has.
For testing purposes APM uses 3 custom users:

**apm_read_user**: Apps: read. Indices: read (`apm-*`)

**apm_write_user**: Apps: read/write. Indices: read (`apm-*`)

**kibana_write_user** Apps: read/write. Indices: None

To create the users with the correct roles run the following script:

```sh
node x-pack/plugins/apm/scripts/setup-kibana-security.js --role-suffix <github-username-or-something-unique>
```

The users will be created with the password specified in kibana.dev.yml for `elasticsearch.password`

### Debugging Elasticsearch queries

All APM api endpoints accept `_debug=true` as a query param that will result in the underlying ES query being outputted in the Kibana backend process.

Example:
`/api/apm/services/my_service?_debug=true`

#### Storybook

Start the [Storybook](https://storybook.js.org/) development environment with
`yarn storybook apm`. All files with a .stories.tsx extension will be loaded.
You can access the development environment at http://localhost:9001.

#### Further resources

- [Cypress integration tests](./e2e/README.md)
- [VSCode setup instructions](./dev_docs/vscode_setup.md)
- [Github PR commands](./dev_docs/github_commands.md)
- [Telemetry](./dev_docs/telemetry.md)
