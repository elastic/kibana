# Maps

Visualize geo data from Elasticsearch or 3rd party geo-services.


## Testing

Run all tests from the `x-pack` root directory

- Unit tests: `yarn test:jest x-pack/plugins/maps --watch`
- Functional tests:
  - Run `node scripts/functional_tests_server`
  - Run `node ../scripts/functional_test_runner.js --config ./test/functional/config.js --grep="maps app"`