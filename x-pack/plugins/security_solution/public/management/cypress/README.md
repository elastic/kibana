# Cypress Tests

The `management/cypress` directory contains functional UI tests that execute using [Cypress](https://www.cypress.io/).

## Running the tests

There are currently three ways to run the tests, comprised of two execution modes and two target environments, which will be detailed below.

### Execution modes

#### Interactive mode

When you run Cypress in interactive mode, an interactive runner is displayed that allows you to see commands as they execute while also viewing the application under test. For more information, please see [cypress documentation](https://docs.cypress.io/guides/core-concepts/test-runner.html#Overview).

#### Headless mode

A headless browser is a browser simulation program that does not have a user interface. These programs operate like any other browser but do not display any UI. This is why meanwhile you are executing the tests on this mode you are not going to see the application under test. Just the output of the test is displayed on the terminal once the execution is finished.

### Target environments

#### FTR (CI)

This is the configuration used by CI. It uses the FTR to spawn both a Kibana instance (http://localhost:5620) and an Elasticsearch instance (http://localhost:9220) with a preloaded minimum set of data (see preceding "Test data" section), and then executes cypress against this stack. You can find this configuration in `x-pack/test/defend_workflows_cypress`

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
yarn cypress:dw:run-as-ci
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
yarn cypress:dw:open-as-ci
```

Note that you can select the browser you want to use on the top right side of the interactive runner.

## Folder Structure

### integration/

Cypress convention. Contains the specs that are going to be executed.

### fixtures/

Cypress convention. Fixtures are used as external pieces of static data when we stub responses.

### plugins/

Cypress convention. As a convenience, by default Cypress will automatically include the plugins file cypress/plugins/index.js before every single spec file it runs.

### screens/

Contains the elements we want to interact with within our tests.

Each file inside the screens folder represents a screen in our application.

### tasks/

_Tasks_ are functions that may be reused across tests.

Each file inside the tasks folder represents a screen of our application. 

## Test data

The data the tests need:

- Is generated on the fly using our application APIs (preferred way)

## Development Best Practices

### Clean up the state 

Remember to clean up the state of the test after its execution. Be mindful of failure scenarios, as well: if your test fails, will it leave the environment in a recoverable state?

### Minimize the use of es_archive

When possible, create all the data that you need for executing the tests using the application APIS or the UI.

### Speed up test execution time

Loading the web page takes a big amount of time, in order to minimize that impact, the following points should be
taken into consideration until another solution is implemented:

- Group the tests that are similar in different contexts.
- For every context login only once, and clean the state between tests if needed without reloading the page.
- All tests in a spec file must be order-independent.

Remember that by minimizing the number of times the web page is loaded, we minimize the execution time as well.

## Linting

Optional linting rules for Cypress and linting setup can be found [here](https://github.com/cypress-io/eslint-plugin-cypress#usage)
