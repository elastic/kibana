# Chat Solution Serverless Tests

This directory contains **Chat-specific** serverless test scenarios. For detailed serverless testing guidelines, authentication setup, role-based testing, and MKI configuration, refer to the comprehensive platform documentation: [`x-pack/platform/test/serverless/README.md`](../../../../platform/test/serverless/README.md).

**Important**: Platform-shared serverless functionality that works across all project types (Security, Observability, Search) is located in `x-pack/platform/test/serverless`. Only Chat-unique serverless test scenarios should be added here.

## Test Structure

```
x-pack/solutions/chat/test/serverless/
├─ api_integration/
│  ├─ configs/
│  ├─ services/             # Chat serverless API services
│  └─ test_suites/          # Chat-specific API tests
├─ functional/
│  ├─ configs/
│  ├─ services/             # Chat serverless UI services
│  ├─ page_objects/         # Chat serverless page objects
│  ├─ configs/
│  └─ test_suites/          # Chat-specific UI tests
```

## Running Tests

### Local Development

```bash
# API integration tests
node scripts/functional_tests_server.js --config x-pack/solutions/chat/test/serverless/api_integration/configs/config.ts
node scripts/functional_test_runner.js --config x-pack/solutions/chat/test/serverless/api_integration/configs/config.ts

# Functional tests
node scripts/functional_tests_server.js --config x-pack/solutions/chat/test/serverless/functional/configs/config.ts
node scripts/functional_test_runner.js --config x-pack/solutions/chat/test/serverless/functional/configs/config.ts
```

**Note**: The config paths shown above are examples. Replace it with the actual path to the config file for the test suite you want to run.

### Running Against MKI

```bash
# Example with Chat project
TEST_CLOUD=1 TEST_CLOUD_HOST_NAME="YOUR_CLOUD_HOST" \
TEST_ES_URL="https://USERNAME:PASSWORD@ES_HOSTNAME:443" \
TEST_KIBANA_URL="https://USERNAME:PASSWORD@KIBANA_HOSTNAME" \
node scripts/functional_test_runner.js --config x-pack/solutions/chat/test/serverless/api_integration/configs/config.ts --exclude-tag=skipMKI
```
