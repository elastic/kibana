# Documentation for Transforms UI developers

This plugin provides access to the transforms features provided by Elastic.

## Requirements

To use the transforms feature, you must have at least a Basic license. For more 
info, refer to 
[Set up transforms](https://www.elastic.co/guide/en/elasticsearch/reference/current/transform-setup.html).


## Setup local environment

### Kibana

1. Fork and clone the [Kibana repo](https://github.com/elastic/kibana).

1. Install `nvm`, `node`, `yarn` (for example, by using Homebrew). See 
   [Install dependencies](https://www.elastic.co/guide/en/kibana/master/development-getting-started.html#_install_dependencies).

1. Make sure that Elasticsearch is deployed and running on `localhost:9200`.

1. Navigate to the directory of the `kibana` repository on your machine.

1. Fetch the latest changes from the repository.

1. Checkout the branch of the version you want to use. For example, if you want 
   to use a 7.9 version, run `git checkout 7.9`. (Your Elasticsearch and Kibana 
   instances need to be the same version.)

1. Run `nvm use`. The response shows the Node version that the environment uses. 
   If you need to update your Node version, the response message contains the 
   command you need to run to do it.

1. Run `yarn kbn bootstrap`. It takes all the dependencies in the code and 
   installs/checks them. It is recommended to use it every time when you switch 
   between branches.

1. Make a copy of `kibana.yml` and save as `kibana.dev.yml`. (Git will not track
   the changes in `kibana.dev.yml` but yarn will use it.)
   
1. Provide the appropriate password and user name in `kibana.dev.yml`.

1. Run `yarn start` to start Kibana.

1. Go to http://localhost:560x/xxx (check the terminal message for the exact 
   path).

For more details, refer to this [getting started](https://www.elastic.co/guide/en/kibana/master/development-getting-started.html) page.

### Adding sample data to Kibana

Kibana has sample data sets that you can add to your setup so that you can test 
different configurations on sample data.

1. Click the Elastic logo in the upper left hand corner of your browser to 
   navigate to the Kibana home page.

1. Click *Load a data set and a Kibana dashboard*.

1. Pick a data set or feel free to click *Add* on all of the available sample 
   data sets.

These data sets are now ready to be used for creating transforms in Kibana.

## Running tests

### Jest tests

Documentation: https://www.elastic.co/guide/en/kibana/current/development-tests.html#_unit_testing

Run the test following jest tests from `kibana/x-pack/plugins/transform.

New snapshots, all plugins:   

```
yarn test:jest
```
 
Update snapshots for the transform plugin: 

```
yarn test:jest -u
```

Update snapshots for a specific directory only: 

```
yarn test:jest public/app/sections
```

Run tests with verbose output: 

```
yarn test:jest --verbose
```

### Functional tests

Before running the test server, make sure to quit all other instances of 
Elasticsearch.

Run the following commands from the `x-pack` directory and use separate terminals
for test server and test runner. The test server command starts an Elasticsearch
and Kibana instance that the tests will be run against.

1. Functional UI tests with `Trial` license (default config):

        node scripts/functional_tests_server.js
        node scripts/functional_test_runner.js --include-tag transform

    Transform functional `Trial` license tests are located in `x-pack/test/functional/apps/transform`.

1. Functional UI tests with `Basic` license:

        node scripts/functional_tests_server.js --config test/functional_basic/config.ts
        node scripts/functional_test_runner.js --config test/functional_basic/config.ts --include-tag transform

    Transform functional `Basic` license tests are located in `x-pack/test/functional_basic/apps/transform`.

1. API integration tests with `Trial` license:

        node scripts/functional_tests_server.js
        node scripts/functional_test_runner.js --config test/api_integration/config.ts --include-tag transform
        
   Transform API integration `Trial` license tests are located in `x-pack/test/api_integration/apis/transform`.

1. API integration tests with `Basic` license:

        node scripts/functional_tests_server.js --config test/api_integration_basic/config.ts
        node scripts/functional_test_runner.js --config test/api_integration_basic/config.ts --include-tag transform
        
   Transform API integration `Basic` license tests are located in `x-pack/test/api_integration_basic/apis/ml`.
   
1.  Accessibility tests:

    We maintain a suite of accessibility tests (you may see them referred to elsewhere as `a11y` tests). These tests render each of our pages and ensure that the inputs and other elements contain the attributes necessary to ensure all users are able to make use of Transforms (for example, users relying on screen readers).

         node scripts/functional_tests_server --config test/accessibility/config.ts
         node scripts/functional_test_runner.js --config test/accessibility/config.ts --grep=transform

    Transform accessibility tests are located in `x-pack/test/accessibility/apps`.
