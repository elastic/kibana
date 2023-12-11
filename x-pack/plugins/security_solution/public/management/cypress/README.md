# Cypress Tests

The `plugins/security_solution/public/management/cypress` directory contains functional UI tests that execute
using [Cypress](https://www.cypress.io/).

## Pre-requisites

Good to have before you run the tests:

- Docker CLI, as Docker desktop doesn't install it by default. Install using `brew`:

```shell
brew install docker
```

- [Multipass](https://multipass.run/) for running the tests against real endpoint. Install using `brew`:

```shell
brew install multipass
```

If you also want to run the tests against real endpoints as on the CI pipeline, then you need to have the following:

- [Vagrant](https://developer.hashicorp.com/vagrant/docs/installation)
- [Vagrant provider for VMware](https://developer.hashicorp.com/vagrant/docs/providers/vmware/installation)
- [Vagrant VMware Utility](https://developer.hashicorp.com/vagrant/docs/providers/vmware/vagrant-vmware-utility)
- [VMware Fusion](https://www.vmware.com/products/fusion/fusion-evaluation.html)

See [running interactive tests on real endpoint with vagrant](#cypress-interactive-with-real-endpoints-using-vagrant)
for more information.

## Adding new tests - tagging for ESS vs Serverless

Similarly to Security Solution cypress tests, we use tags in order to select which tests we want to execute on which environment:

- `@serverless` includes a test in the Serverless test suite. You need to explicitly add this tag to any test you want to run against a Serverless environment.
- `@ess` includes a test in the normal, non-Serverless test suite. You need to explicitly add this tag to any test you want to run against a non-Serverless environment.
- `@brokenInServerless` excludes a test from the Serverless test suite (even if it's tagged as `@serverless`). Indicates that a test should run in Serverless, but currently is broken.
- `@skipInServerless` excludes a test from the Serverless test suite (even if it's tagged as `@serverless`). Indicates that we don't want to run the given test in Serverless.

Important: if you don't provide any tag, your test won't be executed.

## Running the tests

There are currently three ways to run the tests, comprised of two execution modes and two target environments, which
will be detailed below.

### Environment Variables

The test suites are set up with defaults for Kibana and Elasticsearch. The following environment variables can be set to
changes those defaults and target a run against different instances of the stack:

```
CYPRESS_KIBANA_URL
CYPRESS_KIBANA_USERNAME
CYPRESS_KIBANA_PASSWORD
CYPRESS_ELASTICSEARCH_URL
CYPRESS_ELASTICSEARCH_USERNAME
CYPRESS_ELASTICSEARCH_PASSWORD
CYPRESS_BASE_URL
```

Some notes:

- The `ELASTICSEARCH_USERNAME` and `ELASTICSEARCH_PASSWORD` should have sufficient privileges to CRUD on restricted indices.
- Both URL variables should **NOT** include credentials in the url
- `KIBANA_URL` and `BASE_URL` will almost always be the same

Example:

```shell
yarn --cwd x-pack/plugins/security_solution
CYPRESS_BASE_URL=http://localhost:5601 \
CYPRESS_KIBANA_URL=http://localhost:5601 \
CYPRESS_KIBANA_USERNAME=elastic \
CYPRESS_KIBANA_PASSWORD=changeme \
CYPRESS_ELASTICSEARCH_USERNAME=system_indices_superuser \
CYPRESS_ELASTICSEARCH_PASSWORD=changeme \
CYPRESS_ELASTICSEARCH_URL=http://localhost:9200 cypress:dw:open
```

### Execution modes

#### Interactive mode

When you run Cypress in interactive mode, an interactive runner is displayed that allows you to see commands as they
execute while also viewing the application under test. For more information, please
see [cypress documentation](https://docs.cypress.io/guides/core-concepts/test-runner.html#Overview).

#### Headless mode

A headless browser is a browser simulation program that does not have a user interface. These programs operate like any
other browser but do not display any UI. So when you are executing the tests on this mode you are not
going to see the application under test. Just the output of the test is displayed on the terminal once the execution is
finished.

### Target environments

#### FTR (CI)

This is the configuration used by CI. It uses the FTR to spawn both a Kibana instance (http://localhost:5620) and an
Elasticsearch instance (http://localhost:9220) with a preloaded minimum set of data (see preceding "Test data" section),
and then executes cypress against this stack. You can find this configuration in `x-pack/test/defend_workflows_cypress`

### Test Execution: Examples

#### Cypress + Headless (Chrome)

Since this is how tests are run on CI, this will likely be the configuration you want to use in order to reproduce
failures locally, etc.

```shell
# bootstrap kibana from the project root and build the plugins/assets that cypress will execute against
yarn kbn bootstrap && node scripts/build_kibana_platform_plugins

# launch the cypress test runner against ESS
yarn --cwd x-pack/plugins/security_solution cypress:dw:run

# or against Serverless
yarn --cwd x-pack/plugins/security_solution cypress:dw:serverless:run
```

#### Cypress

This is the preferred mode for developing new tests against mocked data

```shell
# bootstrap kibana from the project root and build the plugins/assets that cypress will execute against
yarn kbn bootstrap && node scripts/build_kibana_platform_plugins

# launch the cypress test runner against ESS
yarn --cwd x-pack/plugins/security_solution cypress:dw:open

# or against Serverless
yarn --cwd x-pack/plugins/security_solution cypress:dw:serverless:open
```

## Folder Structure

### e2e/

Contains all the tests. Within it are two sub-folders:

### integration/

Cypress convention. Contains the specs that are going to be executed.

### fixtures/

Cypress convention. Fixtures are used as external pieces of static data when we stub responses.

### support/

Cypress convention. As a convenience, by default Cypress will automatically include the plugins file
cypress/plugins/index.js before every single spec file it runs.
Directory also holds Cypress Plugins that are then initialized via `setupNodeEvents()` in the Cypress configuration.

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

Remember to clean up the state of the test after its execution. Be mindful of failure scenarios, as well: if your test
fails, will it leave the environment in a recoverable state?

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

Optional linting rules for Cypress and linting setup can be
found [here](https://github.com/cypress-io/eslint-plugin-cypress#usage)
