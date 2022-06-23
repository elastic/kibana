The Stack Monitoring plugin uses standard Kibana testing constructs.

See the [Kibana Testing guide](https://www.elastic.co/guide/en/kibana/master/development-tests.html) for details on how to run the various test suites.

We mainly use:
1. Jest unit tests - located in sibling files to the source code 
2. [api_integration tests](../../../../test/api_integration/apis/monitoring)
3. [functional tests](../../../../test/functional/apps/monitoring)

The functional and api integration tests are both under a 'Monitoring' description, so you can use `--grep Monitoring` to run only our tests.