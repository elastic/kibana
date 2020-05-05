# Lens

## Testing

Run all tests from the `x-pack` root directory

- Unit tests: `node scripts/jest --watch lens`
- Functional tests:
  - Run `node scripts/functional_tests_server`
  - Run `node ../scripts/functional_test_runner.js --config ./test/functional/config.js --grep="lens app"`
  - You may want to comment out all imports except for Lens in the config file.
- API Functional tests:
  - Run `node scripts/functional_tests_server`
  - Run `node ../scripts/functional_test_runner.js --config ./test/api_integration/config.js --grep=Lens`
