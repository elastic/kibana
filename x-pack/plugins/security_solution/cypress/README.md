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

#### FTR + Headless

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

#### Custom Target + Headless

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

## Folder Structure

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
- Is ingested on the ELS instance using the `es_archive` utility

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
