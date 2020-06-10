# Cypress Tests

The `security_solution/cypress` directory contains end to end tests, (plus a few tests
that rely on mocked API calls), that execute via [Cypress](https://www.cypress.io/).

Cypress tests may be run against:

- A local Kibana instance, interactively or via the command line. Credentials
are specified via `kibana.dev.yml` or environment variables.
- A remote Elastic Cloud instance (override `baseUrl`), interactively or via
the command line. Again, credentials are specified via `kibana.dev.yml` or
environment variables.
- As part of CI (override `baseUrl` and pass credentials via the
`CYPRESS_ELASTICSEARCH_USERNAME` and `CYPRESS_ELASTICSEARCH_PASSWORD`
environment variables), via command line.

At present, Cypress tests are only executed manually. They are **not** yet
integrated in the Kibana CI infrastructure, and therefore do **not** run
automatically when you submit a PR.

## Smoke Tests

Smoke Tests are located in `security_solution/cypress/integration/smoke_tests`

## Structure

### Tasks

_Tasks_ are functions that my be re-used across tests. Inside the _tasks_ folder there are some other folders that represents 
the page to which we will perform the actions. For each folder we are going to create a file for each one of the sections that
 has the page.

i.e.
- tasks
  - hosts
    - events.ts

### Screens

In _screens_ folder we are going to find all the elements we want to interact in our tests. Inside _screens_ fonder there
are some other folders that represents the page that contains the elements the tests are going to interact with. For each 
folder we are going to create a file for each one of the sections that the page has.

i.e.
- tasks
  - hosts
    - events.ts      

## Mock Data

We prefer not to mock API responses in most of our smoke tests, but sometimes
it's necessary because a test must assert that a specific value is rendered,
and it's not possible to derive that value based on the data in the
environment where tests are running.

Mocked responses API from the server are located in `security_solution/cypress/fixtures`.

## Speeding up test execution time

Loading the web page takes a big amount of time, in order to minimize that impact, the following points should be
taken into consideration until another solution is implemented:

- Don't refresh the page for every test to clean the state of it.
- Instead, group the tests that are similar in different contexts.
- For every context login only once, clean the state between tests if needed without re-loading the page.
- All tests in a spec file must be order-independent. 
    - If you need to reload the page to make the tests order-independent, consider to create a new context.

Remember that minimizing the number of times the web page is loaded, we minimize as well the execution time.

## Authentication

When running tests, there are two ways to specify the credentials used to
authenticate with Kibana:

- Via `kibana.dev.yml` (recommended for developers)
- Via the `CYPRESS_ELASTICSEARCH_USERNAME` and `CYPRESS_ELASTICSEARCH_PASSWORD`
environment variables (recommended for CI), or when testing a remote Kibana
instance, e.g. in Elastic Cloud.

Note: Tests that use the `login()` test helper function for authentication will
automatically use the `CYPRESS_ELASTICSEARCH_USERNAME` and `CYPRESS_ELASTICSEARCH_PASSWORD`
environment variables when they are defined, and fall back to the values in
`config/kibana.dev.yml` when they are unset.

### Content Security Policy (CSP) Settings

Your local or cloud Kibana server must have the `csp.strict: false` setting
configured in `kibana.dev.yml`, or `kibana.yml`, as shown in the example below:

```yaml
csp.strict: false
```

The above setting is required to prevent the _Please upgrade
your browser_ / _This Kibana installation has strict security requirements
enabled that your current browser does not meet._ warning that's displayed for
unsupported user agents, like the one reported by Cypress when running tests.

### Example `kibana.dev.yml`

If you're a developer running tests interactively or on the command line, the
easiset way to specify the credentials used for authentication is to update
 `kibana.dev.yml` per the following example:

```yaml
csp.strict: false
elasticsearch:
  username: 'elastic'
  password: '<password>'
  hosts: ['https://<server>:9200']
```

## Running (Headless) Tests on the Command Line as a Jenkins execution (The preferred way)

To run (headless) tests as a Jenkins execution.

1. First bootstrap kibana changes from the Kibana root directory:

```sh
yarn kbn bootstrap
```

2. Launch Cypress command line test runner:

```sh 
cd x-pack/plugins/security_solution
yarn cypress:run-as-ci
```

Note that with this type of execution you don't need to have running a kibana and elasticsearch instance. This is because
 the command, as it would happen in the CI, will launch the instances. The elasticsearch instance will be fed data 
 found in: `x-pack/test/security_solution_cypress/es_archives`
 
As in this case we want to mimic a CI execution we want to execute the tests with the same set of data, this is why 
in this case does not make sense to override Cypress environment variables. 

Note: To `run-as-ci` with the Cypress UI, update [x-pack/test/security_solution_cypress/runner.ts](https://github.com/elastic/kibana/blob/master/x-pack/test/security_solution_cypress/runner.ts#L25) from 
``` ts
args: ['cypress:run'],
```
to 
``` ts
args: ['cypress:open'],
```
This is helpful for debugging specific failed tests from CI without having to run the entire suite.

Note: Please don't commit this change.
### Test data

As mentioned above, when running the tests as Jenkins the tests are populated with data ("archives") found in: `x-pack/test/security_solution_cypress/es_archives`.

By default, each test is populated with some base data: an empty kibana index and a set of auditbeat data (the `empty_kibana` and `auditbeat` archives, respectively). This is usually enough to cover most of the scenarios that we are testing.

#### Running tests with additional archives

When the base data is insufficient, one can specify additional archives. Use `esArchiverLoad` to load the necessary archive, and `esArchiverUnload` to remove the archive from elasticsearch:

```typescript
import { esArchiverLoad, esArchiverUnload } from '../tasks/es_archiver';

describe('This are going to be a set of tests', () => {
  before(() => {
    esArchiverLoad('name_of_the_data_set_you_want_to_load');
  });

  after(() => {
    esArchiverUnload('name_of_the_data_set_you_want_to_unload');
  });

  it('Going to test something awesome', () => {
    hereGoesYourAwesomeTestcode     
  });
});

```

Note that loading and unloading data take a significant amount of time, so try to minimize their use.

### Current archives

The current archives can be found in `x-pack/test/security_solution_cypress/es_archives/`.

- auditbeat
  - Auditbeat data generated in Sep, 2019 with the following hosts present: 
    - suricata-iowa
    - siem-kibana
    - siem-es
    - jessie
- closed_alerts
  - Set of data with 108 closed alerts linked to "Alerts test" custom rule.
- custome_rules
  - Set if data with just 4 custom activated rules. 
- empty_kibana
  - Empty kibana board.
- prebuilt_rules_loaded
  - Elastic prebuilt loaded rules and deactivated. 
- alerts
  - Set of data with 108 opened alerts linked to "Alerts test" custom rule.

### How to generate a new archive

We are using es_archiver in order to manage the data that our Cypress tests needs.

1. Setup if possible a clean instance of kibana and elasticsearch (if not, possible please try to clean the data that you are going to generate).
2. With the kibana and elasticsearch instance up and running, create the data that you need for your test.
3. When you are sure that you have all the data you need run the following command from: `x-pack/plugins/security_solution`

```sh 
node ../../../scripts/es_archiver save <nameOfTheFolderWhereDataIsSaved> <indexPatternsToBeSaved>  --dir ../../test/security_solution_cypress/es_archives --config ../../../test/functional/config.js --es-url http://<elasticsearchUsername>:<elasticsearchPassword>@<elasticsearchHost>:<elasticsearchPort>
```

Example: 
```sh
node ../../../scripts/es_archiver save custom_rules ".kibana",".siem-signal*"  --dir ../../test/security_solution_cypress/es_archives --config ../../../test/functional/config.js --es-url http://elastic:changeme@localhost:9220
```

Note that the command is going to create the folder if does not exist in the directory with the imported data.


## Running Tests Interactively

Use the Cypress interactive test runner to develop and debug specific tests
by adding a `.only` to the test you're developing, or click on a specific
spec in the interactive test runner to run just the tests in that spec.

To run and debug tests in interactively via the Cypress test runner:

1. Disable CSP on the local or remote Kibana instance, as described in the
_Content Security Policy (CSP) Settings_ section above.

2. To specify the credentials required for authentication, configure
`config/kibana.dev.yml`, as described in the _Server and Authentication
Requirements_ section above, or specify them via environment variables
as described later in this section.

3. Start a local instance of the Kibana development server (only if testing against a
local host):

```sh
yarn start --no-base-path
```

4. Launch the Cypress interactive test runner via one of the following options:

- To run tests interactively against the default (local) host specified by
`baseUrl`, as configured in `plugins/security_solution/cypress.json`:

```sh
cd x-pack/plugins/security_solution
yarn cypress:open
```

- To (optionally) run tests interactively against a different host, pass the
`CYPRESS_baseUrl` environment variable on the command line when launching the
test runner, as shown in the following example:

```sh
cd x-pack/plugins/security_solution
CYPRESS_baseUrl=http://localhost:5601 yarn cypress:open
```

- To (optionally) override username and password via environment variables when
running tests interactively:

```sh
cd x-pack/plugins/security_solution
CYPRESS_baseUrl=http://localhost:5601 CYPRESS_ELASTICSEARCH_USERNAME=elastic CYPRESS_ELASTICSEARCH_PASSWORD=<password> yarn cypress:open
```

5. Click the `Run all specs` button in the Cypress test runner (after adding
a `.only` to an `it` or `describe` block).

## Running (Headless) Tests on the Command Line

To run (headless) tests on the command line:

1. Disable CSP on the local or remote Kibana instance, as described in the
_Content Security Policy (CSP) Settings_ section above.

2. To specify the credentials required for authentication, configure
`config/kibana.dev.yml`, as described in the _Server and Authentication
Requirements_ section above, or specify them via environment variables
as described later in this section.

3. Start a local instance of the Kibana development server (only if testing against a
local host):

```sh
yarn start --no-base-path
```

4. Launch the Cypress command line test runner via one of the following options:

- To run tests on the command line against the default (local) host specified by
`baseUrl`, as configured in `plugins/security_solution/cypress.json`:

```sh
cd x-pack/plugins/security_solution
yarn cypress:run
```

- To (optionally) run tests on the command line against a different host, pass
`CYPRESS_baseUrl` as an environment variable on the command line, as shown in
the following example:

```sh
cd x-pack/plugins/security_solution
CYPRESS_baseUrl=http://localhost:5601 yarn cypress:run
```

- To (optionally) override username and password via environment variables when
running via the command line:

```sh
cd x-pack/plugins/security_solution
CYPRESS_baseUrl=http://localhost:5601 CYPRESS_ELASTICSEARCH_USERNAME=elastic CYPRESS_ELASTICSEARCH_PASSWORD=<password> yarn cypress:run
```

## Reporting

When Cypress tests are run on the command line via `yarn cypress:run`,
reporting artifacts are generated under the `target` directory in the root
of the Kibana, as detailed for each artifact type in the sections below.

### HTML Reports

An HTML report (e.g. for email notifications) is output to:

```
target/kibana-security-solution/cypress/results/output.html
```

### Screenshots

Screenshots of failed tests are output to:

```
target/kibana-security-solution/cypress/screenshots
```

### `junit` Reports

The Kibana CI process reports `junit` test results from the `target/junit` directory.

Cypress `junit` reports are generated in `target/kibana-security-solution/cypress/results`
and copied to the `target/junit` directory.

### Videos (optional)

Videos are disabled by default, but can optionally be enabled by setting the
`CYPRESS_video=true` environment variable:

```
CYPRESS_video=true yarn cypress:run
```

Videos are (optionally) output to:

```
target/kibana-security-solution/cypress/videos
```

## Linting 

Optional linting rules for Cypress and linting setup can be found [here](https://github.com/cypress-io/eslint-plugin-cypress#usage)
