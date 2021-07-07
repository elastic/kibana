# Cypress Tests

The `security_solution/cypress` directory contains functional UI tests that execute using [Cypress](https://www.cypress.io/).

## Running the tests

There are currently four ways to run the tests, comprised of two execution modes and two target environments, which will be detailed below.

### Execution modes

#### Interactive mode

When you run Cypress in interactive mode, an interactive runner is displayed that allows you to see commands as they execute while also viewing the application under test. For more information, please see [cypress documentation](https://docs.cypress.io/guides/core-concepts/test-runner.html#Overview).

#### Headless mode

A headless browser is a browser simulation program that does not have a user interface. These programs operate like any other browser, but do not display any UI. This is why meanwhile you are executing the tests on this mode you are not going to see the application under test. Just the output of the test is displayed on the terminal once the execution is finished.

### Target environments

#### FTR (CI)

This is the configuration used by CI. It uses the FTR to spawn both a Kibana instance (http://localhost:5620) and an Elasticsearch instance (http://localhost:9220) with a preloaded minimum set of data (see preceding "Test data" section), and then executes cypress against this stack. You can find this configuration in `x-pack/test/security_solution_cypress`

#### Custom Targets

This configuration runs cypress tests against an arbitrary host.
**WARNING**: When using your own instances you need to take into account that if you already have data on it, the tests may fail, as well as, they can put your instances in an undesired state, since our tests uses es_archive to populate data.

### Test Execution: Examples

#### FTR + Headless (Chrome)

Since this is how tests are run on CI, this will likely be the configuration you want to reproduce failures locally, etc.

```shell
# bootstrap kibana from the project root
yarn kbn bootstrap

# build the plugins/assets that cypress will execute against
node scripts/build_kibana_platform_plugins

# launch the cypress test runner
cd x-pack/plugins/security_solution
yarn cypress:run-as-ci
```

#### FTR + Headless (Firefox)

Since this is how tests are run on CI, this will likely be the configuration you want to reproduce failures locally, etc.

```shell
# bootstrap kibana from the project root
yarn kbn bootstrap

# build the plugins/assets that cypress will execute against
node scripts/build_kibana_platform_plugins

# launch the cypress test runner
cd x-pack/plugins/security_solution
yarn cypress:run-as-ci:firefox
```

#### FTR + Interactive

This is the preferred mode for developing new tests.

```shell
# bootstrap kibana from the project root
yarn kbn bootstrap

# build the plugins/assets that cypress will execute against
node scripts/build_kibana_platform_plugins

# launch the cypress test runner
cd x-pack/plugins/security_solution
yarn cypress:open-as-ci
```

Note that you can select the browser you want to use on the top right side of the interactive runner.

#### Custom Target + Headless (Chrome)

This mode may be useful for testing a release, e.g. spin up a build candidate
and point cypress at it to catch regressions.

```shell
# bootstrap kibana from the project root
yarn kbn bootstrap

# load auditbeat data needed for test execution (which FTR normally does for us)
cd x-pack/plugins/security_solution
node ../../../scripts/es_archiver load auditbeat --dir ../../test/security_solution_cypress/es_archives --config ../../../test/functional/config.js --es-url http(s)://<username>:<password>@<elsUrl> --kibana-url http(s)://<userName>:<password>@<kbnUrl>

# launch the cypress test runner with overridden environment variables
cd x-pack/plugins/security_solution
CYPRESS_BASE_URL=http(s)://<username>:<password>@<kbnUrl> CYPRESS_ELASTICSEARCH_URL=http(s)://<username>:<password>@<elsUrl> CYPRESS_ELASTICSEARCH_USERNAME=<username> CYPRESS_ELASTICSEARCH_PASSWORD=password yarn cypress:run
```

#### Custom Target + Headless (Firefox)

This mode may be useful for testing a release, e.g. spin up a build candidate
and point cypress at it to catch regressions.

```shell
# bootstrap kibana from the project root
yarn kbn bootstrap

# load auditbeat data needed for test execution (which FTR normally does for us)
cd x-pack/plugins/security_solution
node ../../../scripts/es_archiver load auditbeat --dir ../../test/security_solution_cypress/es_archives --config ../../../test/functional/config.js --es-url http(s)://<username>:<password>@<elsUrl> --kibana-url http(s)://<userName>:<password>@<kbnUrl>

# launch the cypress test runner with overridden environment variables
cd x-pack/plugins/security_solution
CYPRESS_BASE_URL=http(s)://<username>:<password>@<kbnUrl> CYPRESS_ELASTICSEARCH_URL=http(s)://<username>:<password>@<elsUrl> CYPRESS_ELASTICSEARCH_USERNAME=<username> CYPRESS_ELASTICSEARCH_PASSWORD=password yarn cypress:run:firefox
```

#### CCS Custom Target + Headless

This test execution requires two clusters configured for CCS. See [Search across clusters](https://www.elastic.co/guide/en/elasticsearch/reference/current/modules-cross-cluster-search.html) for instructions on how to prepare such setup.

The instructions below assume:
* Search cluster is on server1
* Remote cluster is on server2
* Remote cluster is accessible from the search cluster with name `remote`
* Security and TLS are enabled

```shell
# bootstrap Kibana from the project root
yarn kbn bootstrap

# launch the Cypress test runner with overridden environment variables
cd x-pack/plugins/security_solution
CYPRESS_ELASTICSEARCH_USERNAME="user" \
CYPRESS_ELASTICSEARCH_PASSWORD="pass" \
CYPRESS_BASE_URL="https://user:pass@server1:5601" \
CYPRESS_ELASTICSEARCH_URL="https://user:pass@server1:9200" \
CYPRESS_CCS_KIBANA_URL="https://user:pass@server2:5601" \
CYPRESS_CCS_ELASTICSEARCH_URL="https://user:pass@server2:9200" \
CYPRESS_CCS_REMOTE_NAME="remote" \
yarn cypress:run:ccs
```

Similar sequence, just ending with `yarn cypress:open:ccs`, can be used for interactive test running via Cypress UI.

Appending `--browser firefox` to the `yarn cypress:run:ccs` command above will run the tests on Firefox instead of Chrome.

## Folder Structure

### ccs_integration/

Contains the specs that are executed in a Cross Cluster Search configuration, typically during integration tests.

### integration/

Cypress convention. Contains the specs that are going to be executed.

### fixtures/

Cypress convention. Fixtures are used as external pieces of static data when we stub responses.

### plugins/

Cypress convention. As a convenience, by default Cypress will automatically include the plugins file cypress/plugins/index.js before every single spec file it runs.

### objects/

Contains representations of data used across different tests; our domain objects.

### screens/

Contains the elements we want to interact with in our tests.

Each file inside the screens folder represents a screen in our application. When the screens are complex, e.g. Hosts with its multiple tabs, the page is represented by a folder and the different important parts are represented by files.

Example:

- screens
  - hosts
    - all_hosts.ts
    - authentications.ts
    - events.ts
    - main.ts
    - uncommon_processes.ts

### tasks/

_Tasks_ are functions that may be reused across tests.

Each file inside the tasks folder represents a screen of our application. When the screens are complex, e.g. Hosts with its multiple tabs, the page is represented by a folder and the different important parts are represented by files.

Example:

- tasks
  - hosts
    - all_hosts.ts
    - authentications.ts
    - events.ts
    - main.ts
    - uncommon_processes.ts

### urls/

Represents all the URLs used during the tests execution.

## Test data

The data the tests need:

- Is generated on the fly using our application APIs (preferred way)
- Is ingested on the ELS instance using the `es_archiver` utility

By default, when running the tests in Jenkins mode, a base set of data is ingested on the ELS instance: an empty kibana index and a set of auditbeat data (the `empty_kibana` and `auditbeat` archives, respectively). This is usually enough to cover most of the scenarios that we are testing.

### How to generate a new archive

**Note:** As mentioned above, archives are only meant to contain external data, e.g. beats data. Due to the tendency for archived domain objects (rules, signals) to quickly become out of date, it is strongly suggested that you generate this data within the test, through interaction with either the UI or the API.

We use es_archiver to manage the data that our Cypress tests need.

1. Set up a clean instance of kibana and elasticsearch (if this is not possible, try to clean/minimize the data that you are going to archive).
2. With the kibana and elasticsearch instance up and running, create the data that you need for your test.
3. When you are sure that you have all the data you need run the following command from: `x-pack/plugins/security_solution`

```sh
node ../../../scripts/es_archiver save <nameOfTheFolderWhereDataIsSaved> <indexPatternsToBeSaved>  --dir ../../test/security_solution_cypress/es_archives --config ../../../test/functional/config.js --es-url http://<elasticsearchUsername>:<elasticsearchPassword>@<elasticsearchHost>:<elasticsearchPort>
```

Example:

```sh
node ../../../scripts/es_archiver save custom_rules ".kibana",".siem-signal*"  --dir ../../test/security_solution_cypress/es_archives --config ../../../test/functional/config.js --es-url http://elastic:changeme@localhost:9220
```

Note that the command will create the folder if it does not exist.

### Using an archive from within the Cypress tests

Task [cypress/tasks/es_archiver.ts](https://github.com/elastic/kibana/blob/master/x-pack/plugins/security_solution/cypress/tasks/es_archiver.ts) provides helpers such as `esArchiverLoad` and `esArchiverUnload` by means of `es_archiver`'s CLI.

Because of `cy.exec`, used to invoke `es_archiver`, it's necessary to override its environment with `NODE_TLS_REJECT_UNAUTHORIZED=1`. It indeed would inject `NODE_TLS_REJECT_UNAUTHORIZED=0` and make `es_archive` otherwise abort with the following warning if used over https:

> Warning: Setting the NODE_TLS_REJECT_UNAUTHORIZED environment variable to '0' makes TLS connections and HTTPS requests insecure by disabling certificate verification.

### CCS

Tests running in CCS configuration need to care about two aspects:

1. data (eg. to trigger alerts) is generated/loaded on the remote cluster
2. queries (eg. detection rules) refer to remote indices

Incorrect handling of the above points might result in false positives, in that the remote cluster is not involved but the test passes anyway.

#### Remote data loading

Helpers `esArchiverCCSLoad` and `esArchiverCCSUnload` are provided by [cypress/tasks/es_archiver.ts](https://github.com/elastic/kibana/blob/master/x-pack/plugins/security_solution/cypress/tasks/es_archiver.ts):

```javascript
import { esArchiverCCSLoad, esArchiverCCSUnload } from '../../tasks/es_archiver';
```

They will use the `CYPRESS_CCS_*_URL` environment variables for accessing the remote cluster. Complex tests involving local and remote data can interleave them with `esArchiverLoad` and `esArchiverUnload` as needed.

#### Remote indices queries

Queries accessing remote indices follow the usual `<remote_name>:<remote_index>` notation but should not hard-code the remote name in the test itself.

For such reason the environemnt variable `CYPRESS_CCS_REMOTE_NAME` is defined and, in the case of detection rules, used as shown below:

```javascript
const ccsRemoteName: string = Cypress.env('CCS_REMOTE_NAME');

export const unmappedCCSRule: CustomRule = {
  customQuery: '*:*',
  index: [`${ccsRemoteName}:unmapped*`],
  ...
};

```

Similar approach should be used in defining all index patterns, rules, and queries to be applied on remote data.

## Development Best Practices

### Clean up the state 

Remember to clean up the state of the test after its execution, typically with the `cleanKibana` function. Be mindful of failure scenarios, as well: if your test fails, will it leave the environment in a recoverable state?

### Minimize the use of es_archive

When possible, create all the data that you need for executing the tests using the application APIS or the UI.

### Speed up test execution time

Loading the web page takes a big amount of time, in order to minimize that impact, the following points should be
taken into consideration until another solution is implemented:

- Group the tests that are similar in different contexts.
- For every context login only once, clean the state between tests if needed without re-loading the page.
- All tests in a spec file must be order-independent.

Remember that minimizing the number of times the web page is loaded, we minimize as well the execution time.

## Test Artifacts

When Cypress tests are run headless on the command line, artifacts
are generated under the `target` directory in the root of Kibana as follows:

- HTML Reports
  - location: `target/kibana-security-solution/cypress/results/output.html`
- `junit` Reports
  - location: `target/kibana-security-solution/cypress/results`
- Screenshots (of failed tests)
  - location: `target/kibana-security-solution/cypress/screenshots`
- Videos
  - disabled by default, can be enabled by setting env var `CYPRESS_video=true`
  - location: `target/kibana-security-solution/cypress/videos`

## Linting

Optional linting rules for Cypress and linting setup can be found [here](https://github.com/cypress-io/eslint-plugin-cypress#usage)
