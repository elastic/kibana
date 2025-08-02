# Example plugin functional tests

This folder contains functional tests for the cases plugins.

## Run the test

To run these tests during development you can use the following commands:

```
# Start the test server (can continue running)
node scripts/functional_tests_server.js --config x-pack/test/cases_api_integration/spaces_only/config.ts

# Start a test run
node scripts/functional_test_runner.js --config x-pack/test/cases_api_integration/spaces_only/config.ts
```
