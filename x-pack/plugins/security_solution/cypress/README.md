# Cypress Tests

The `security_solution/cypress` directory contains functional UI tests that execute using [Cypress](https://www.cypress.io/).

## Folder Structure

### Fixtures (Cypress native folder)

Fixtures are used as external pieces of static data when we stub responses.

### Integration (Cypress native folder)

Contains the specs that are going to be executed.

### Objects

Objects are a representation of data used accross different tests.

### Pluggins (Cypress native folder)

By default Cypress will automatically include the plugins file cypress/plugins/index.js before every single spec file it runs. They do this purely as a convenience mechanism so you don’t have to import this that in every single one of your spec files.

### Screens

In _screens_ folder we are going to find all the elements we want to interact in our tests.

Each file inside the tasks folder represents a screen of our application. When the screens are complex i.e. Hosts contains multiple tabs, the page is represented by a folder and the different important parts are represented by files.

i.e.
- tasks
  - hosts
    - all_hosts.ts
    - authentications.ts 
    - events.ts
    - main.ts
    - uncommon_processes.ts  

### Tasks

_Tasks_ are functions that my be re-used across tests. 

Each file inside the tasks folder represents a screen of our application. When the screens are complex i.e. Hosts contains multiple tabs, the page is represented by a folder and the different important parts are represented by files.

i.e.
- tasks
  - hosts
    - all_hosts.ts
    - authentications.ts 
    - events.ts
    - main.ts
    - uncommon_processes.ts

### URLs

Represents all the URLs used during the tests execution.

## Test data

The data the tests need:
- Is generated on the fly using our application APIs (preferred way)
- Is ingested on the ELS instance using es_archive

By default when running the tests on Jenkins mode a base set of data is ingested on the ELS instance: an empty kibana index and a set of auditbeat data (the `empty_kibana` and `auditbeat` archives, respectively). This is usually enough to cover most of the scenarios that we are testing.

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

## Running the tests

You can run the tests in interactive or headless mode, emulating the Jenkins pipeline or using your own instances.

### Interactive vs Headless mode

#### Interactive

When you run the Cypress on interactive mode, an interactive runner is displayed that allows you to see commands as they execute while also viewing the application under test.

For more information, please visit: https://docs.cypress.io/guides/core-concepts/test-runner.html#Overview

#### Headless mode

A headless browser is a browser simulation program that does not have a user interface. These programs operate like any other browser, but do not display any UI. This is why meanwhile you are executing the tests on this mode you are not going to see the application under test. Just the output of the test is displayed on the terminal once the execution is finished.

### Emulating Jenkins vs your own instances

#### Emulating Jenkins

With this mode we use the FTR to run the Cypress tests and automatically, a Kibana instance (http://localhost:5620) and Elastic Search instance (http://localhost:9220) with a preloaded minimum set of data.

You can find the configuration of this mode in `x-pack/test/security_solution_cypress`

#### Your own instances

When using your own instances you need to take into account that if you already have data on it, the tests may fail, as well as, they can put your instances in an undesired state, since our tests uses es_archive to populate data.


### Running Cypress in Headless mode as a Jenkins execution (The preferred way when running regressions on your machine)

1. First bootstrap kibana changes from the Kibana root directory:

```sh
yarn kbn bootstrap
```

2. Build the plugins

```sh
node scripts/build_kibana_platform_plugins
```

3. Launch Cypress command line test runner:

```sh 
cd x-pack/plugins/security_solution
yarn cypress:run-as-ci
```

As explained previously, this type of execution you don't need to have running a kibana and elasticsearch instance. This is because the command, as it would happen in the CI, will launch the instances. The elasticsearch instance will be fed data found in: `x-pack/test/security_solution_cypress/es_archives`
 
### Running Cypress in Interactive mode as a Jenkins execution (The preferred way when developing new cypress tests)

1. First bootstrap kibana changes from the Kibana root directory:

```sh
yarn kbn bootstrap
```

2. Build the plugins

```sh
node scripts/build_kibana_platform_plugins
```

3. Launch Cypress command line test runner:

```sh 
cd x-pack/plugins/security_solution
yarn cypress:open-as-ci
```

As explained previously, this type of execution you don't need to have running a kibana and elasticsearch instance. This is because the command, as it would happen in the CI, will launch the instances. The elasticsearch instance will be fed data found in: `x-pack/test/security_solution_cypress/es_archives`
 
### Running Cypress in your own instances (Recommended just for releases regressions)

1. First bootstrap kibana changes from the Kibana root directory:

```sh
yarn kbn bootstrap
```

2. Load the initial auditbeat set of data needed for the test execution:

```sh
cd x-pack/plugins/security_solution
node ../../../scripts/es_archiver load auditbeat --dir ../../test/security_solution_cypress/es_archives --config ../../../test/functional/config.js --es-url http(s)://<username>:<password>@<elsUrl> --kibana-url http(s)://<userName>:<password>@<kbnUrl>
```

3. Launch Cypress overriden some of the environment variables:

```sh
CYPRESS_BASE_URL=http(s)://<username>:<password>@<kbnUrl> CYPRESS_ELASTICSEARCH_URL=http(s)://<username>:<password>@<elsUrl> CYPRESS_ELASTICSEARCH_USERNAME=<username> CYPRESS_ELASTICSEARCH_PASSWORD=password yarn cypress:run
```

## Best Practices

### Clean up the state between tests

Remember to clean up the state of the test after its execution.

### Minimize the use of es_archive

When possible, create all the data that you need for executing the tests using the application APIS.

### Speed up test execution time

Loading the web page takes a big amount of time, in order to minimize that impact, the following points should be
taken into consideration until another solution is implemented:

- Don't refresh the page for every test to clean the state of it.
- Instead, group the tests that are similar in different contexts.
- For every context login only once, clean the state between tests if needed without re-loading the page.
- All tests in a spec file must be order-independent. 
    - If you need to reload the page to make the tests order-independent, consider to create a new context.

Remember that minimizing the number of times the web page is loaded, we minimize as well the execution time.


## Reporting

When Cypress tests are run on the command line via non visual mode
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
