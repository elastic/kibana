# Documentation for APM UI developers

## Local environment setup

### Kibana

```
git clone git@github.com:elastic/kibana.git
cd kibana/
yarn kbn bootstrap
yarn start --no-base-path
```

### APM Server, Elasticsearch and data

To access an elasticsearch instance that has live data you have two options:

#### A. Connect to Elasticsearch on Cloud (internal devs only)

Find the credentials for the cluster [here](https://github.com/elastic/apm-dev/blob/master/docs/credentials/apm-ui-clusters.md#apmelstcco)

#### B. Start Elastic Stack and APM data generators

```
git clone git@github.com:elastic/apm-integration-testing.git
cd apm-integration-testing/
./scripts/compose.py start master --all --no-kibana
```

_Docker Compose is required_

## Testing

### Cypress tests

```sh
node x-pack/plugins/apm/scripts/ftr_e2e/cypress_run.js
```

_Starts Kibana (:5701), APM Server (:8201) and Elasticsearch (:9201). Ingests sample data into Elasticsearch via APM Server and runs the Cypress tests_

### Jest tests

Note: Run the following commands from `kibana/x-pack/plugins/apm`.

#### Run

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

API tests are separated in two suites: 
 - a basic license test suite
 - a trial license test suite (the equivalent of gold+)

This requires separate test servers and test runners.

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


**API Test tips**
 - For debugging access Elasticsearch on http://localhost:9220` (elastic/changeme)
 - To update snapshots append `--updateSnapshots` to the functional_test_runner command

## Linting

_Note: Run the following commands from `kibana/`._

### Typescript

```
yarn tsc --noEmit --emitDeclarationOnly false --project x-pack/plugins/apm/tsconfig.json --skipLibCheck
```

### Prettier

```
yarn prettier  "./x-pack/plugins/apm/**/*.{tsx,ts,js}" --write
```

### ESLint

```
yarn eslint ./x-pack/plugins/apm --fix
```

## Setup default APM users

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

## Debugging Elasticsearch queries

All APM api endpoints accept `_inspect=true` as a query param that will result in the underlying ES query being outputted in the Kibana backend process.

Example:
`/api/apm/services/my_service?_inspect=true`

## Storybook

Start the [Storybook](https://storybook.js.org/) development environment with
`yarn storybook apm`. All files with a .stories.tsx extension will be loaded.
You can access the development environment at http://localhost:9001.

## Experimental features settings

To set up a flagged feature, add the name of the feature key (`apm:myFeature`) to [commmon/ui_settings_keys.ts](./common/ui_settings_keys.ts) and the feature parameters to [server/ui_settings.ts](./server/ui_settings.ts).

Test for the feature like:

```js
import { myFeatureEnabled } from '../ui_settings_keys';
if (core.uiSettings.get(myFeatureEnabled)) {
  doStuff();
}
```

Settings can be managed in Kibana under Stack Management > Advanced Settings > Observability.

## Further resources

- [Cypress integration tests](./e2e/README.md)
- [VSCode setup instructions](./dev_docs/vscode_setup.md)
- [Github PR commands](./dev_docs/github_commands.md)
- [Routing and Linking](./dev_docs/routing_and_linking.md)
- [Telemetry](./dev_docs/telemetry.md)
