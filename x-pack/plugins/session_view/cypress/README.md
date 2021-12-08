# Cypress Tests

The `session_view/cypress` directory contains functional UI tests that execute using [Cypress](https://www.cypress.io/). Currently with Cypress you can develop `functional` tests.

## Table of Contents

[**How to add a new Cypress test**](#how-to-add-a-new-cypress-test)

[**Running the tests**](#running-the-tests)

[**Debugging your test**](#debugging-your-test)

[**Folder structure**](#folder-structure)

[**Test data**](#test-data)

[**Development Best Practices**](#development-best-practices)

[**Test Artifacts**](#test-artifacts)

[**Linting**](#linting)

## How to add a new Cypress test

Before considering adding a new Cypress tests, please make sure you have added unit and API tests first. Note that, the aim of Cypress
 is to test that the user interface operates as expected, hence, you should not be using this tool to test REST API or data contracts.

First take a look to the [**Development Best Practices**](#development-best-practices) section.
Then check out the [**Folder structure**](#folder-structure) section to know where is the best place to put your test, [**Test data**](#test-data) section if you need to create any type
of data for your test, [**Running the tests**](#running-the-tests) to know how to execute the tests and [**Debugging your test**](#debugging-your-test) to debug your test if needed.

Please, before opening a PR with the new test, please make sure that the test fails. If you never see your test fail you don’t know if your test is actually testing the right thing, or testing anything at all.

## Running the tests

There are currently four ways to run the tests, comprised of two execution modes and two target environments, which will be detailed below.

### Execution modes

#### Interactive mode

When you run Cypress in interactive mode, an interactive runner is displayed that allows you to see commands as they execute while also viewing the application under test. For more information, please see [cypress documentation](https://docs.cypress.io/guides/core-concepts/test-runner.html#Overview).

#### Headless mode

A headless browser is a browser simulation program that does not have a user interface. These programs operate like any other browser, but do not display any UI. This is why meanwhile you are executing the tests on this mode you are not going to see the application under test. Just the output of the test is displayed on the terminal once the execution is finished.

### Target environments

#### FTR (CI)

This is the configuration used by CI. It uses the FTR to spawn both a Kibana instance (http://localhost:5620) and an Elasticsearch instance (http://localhost:9220) with a preloaded minimum set of data (see preceding "Test data" section), and then executes cypress against this stack. You can find this configuration in `x-pack/test/session_view_cypress`

#### Custom Targets

This configuration runs cypress tests against an arbitrary host.
**WARNING**: When using your own instances you need to take into account that if you already have data on it, the tests may fail, as well as, they can put your instances in an undesired state, since our tests uses es_archive to populate data.

### Test Execution

#### FTR + Headless (Chrome)

Since this is how tests are run on CI, this will likely be the configuration you want to reproduce failures locally, etc.

```shell
# bootstrap kibana from the project root
yarn kbn bootstrap

# build the plugins/assets that cypress will execute against
node scripts/build_kibana_platform_plugins

# launch the cypress test runner
cd x-pack/plugins/session_view
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
cd x-pack/plugins/session_view
yarn cypress:run-as-ci:firefox
```

#### FTR + Interactive

This is the preferred mode for developing new tests. You can step into the test execution in browser dev tools.

```shell
# bootstrap kibana from the project root
yarn kbn bootstrap

# build the plugins/assets that cypress will execute against
node scripts/build_kibana_platform_plugins

# launch the cypress test runner
cd x-pack/plugins/session_view
yarn cypress:open-as-ci
```

Note that you can select the browser you want to use on the top right side of the interactive runner.

#### Custom Target + Headless (Chrome)

This mode may be useful for testing a release, e.g. spin up a build candidate
and point cypress at it to catch regressions.

```shell
# bootstrap kibana from the project root
yarn kbn bootstrap

# launch the cypress test runner with overridden environment variables
cd x-pack/plugins/session_view
CYPRESS_BASE_URL=http(s)://<username>:<password>@<kbnUrl> CYPRESS_ELASTICSEARCH_URL=http(s)://<username>:<password>@<elsUrl> CYPRESS_ELASTICSEARCH_USERNAME=<username> CYPRESS_ELASTICSEARCH_PASSWORD=<password> yarn  cypress:run
```

#### Custom Target + Headless (Firefox)

This mode may be useful for testing a release, e.g. spin up a build candidate
and point cypress at it to catch regressions.

```shell
# bootstrap kibana from the project root
yarn kbn bootstrap

# launch the cypress test runner with overridden environment variables
cd x-pack/plugins/session_view
CYPRESS_BASE_URL=http(s)://<username>:<password>@<kbnUrl> CYPRESS_ELASTICSEARCH_URL=http(s)://<username>:<password>@<elsUrl> CYPRESS_ELASTICSEARCH_USERNAME=<username> CYPRESS_ELASTICSEARCH_PASSWORD=<password> yarn cypress:run:firefox
```

## Debugging your test
In order to be able to debug any Cypress test you need to open Cypress on visual mode. [Here](https://docs.cypress.io/guides/guides/debugging)
you can find an extended guide about how to proceed.

If you are debugging a flaky test, a good tip is to insert a `cy.wait(<some long milliseconds>)` around async parts of the tes code base, such as network calls which can make an indeterministic test, deterministically fail locally. 

## Folder Structure

Below you can find the folder structure used on our Cypress tests.

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
3. When you are sure that you have all the data you need run the following command from: `x-pack/plugins/session_view`

```sh
node ../../../scripts/es_archiver save ../../test/session_view_cypress/es_archives <indexPatternsToBeSaved> --config ../../../test/functional/config.js --es-url http://<elasticsearchUsername>:<elasticsearchPassword>@<elasticsearchHost>:<elasticsearchPort>
```

Example:

```sh
node ../../../scripts/es_archiver save ../../test/session_view_cypress/es_archives ".kibana",".siem-signal*","cmd","cmd_entry_leader" --config ../../../test/functional/config.js --es-url http://elastic:changeme@localhost:9200
```

Note that the command will create the folder if it does not exist.

### Using an archive from within the Cypress tests

Task [cypress/tasks/es_archiver.ts](https://github.com/Elastic-AWP-Platform/kibana/blob/main/x-pack/plugins/session_view/cypress/tasks/es_archiver.ts) provides helpers such as `esArchiverLoad` and `esArchiverUnload` by means of `es_archiver`'s CLI.

Because of `cy.exec`, used to invoke `es_archiver`, it's necessary to override its environment with `NODE_TLS_REJECT_UNAUTHORIZED=1`. It indeed would inject `NODE_TLS_REJECT_UNAUTHORIZED=0` and make `es_archive` otherwise abort with the following warning if used over https:

> Warning: Setting the NODE_TLS_REJECT_UNAUTHORIZED environment variable to '0' makes TLS connections and HTTPS requests insecure by disabling certificate verification.

## Development Best Practices
Below you will a set of best practices that should be followed when writing Cypress tests.

### Make sure your test fail

Before open a PR with the new test, please make sure that the test fail. If you never see your test fail you don’t know if your test is actually testing the right thing, or testing anything at all.

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

### Cypress-pipe
It is very common in the code to don't have click handlers regitered. In this specific case, please use [Cypress pipe](https://www.cypress.io/blog/2019/01/22/when-can-the-test-click/). 

## Test Artifacts

When Cypress tests are run headless on the command line, artifacts
are generated under the `target` directory in the root of Kibana as follows:

- HTML Reports
  - location: `target/kibana-session-view/cypress/results/output.html`
- `junit` Reports
  - location: `target/kibana-session-view/cypress/results`
- Screenshots (of failed tests)
  - location: `target/kibana-session-view/cypress/screenshots`
- Videos
  - disabled by default, can be enabled by setting env var `CYPRESS_video=true`
  - location: `target/kibana-session-view/cypress/videos`

## Linting

Optional linting rules for Cypress and linting setup can be found [here](https://github.com/cypress-io/eslint-plugin-cypress#usage)
