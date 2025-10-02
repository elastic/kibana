# OneChat Evaluation Tests

This directory contains evaluation tests for the OneChat plugin tools using Kibana's Functional Test Runner (FTR).

## What are Evaluation Tests?

Evaluation tests are specialized tests that validate the quality and accuracy of AI-generated outputs from OneChat tools. Unlike standard integration tests that verify functionality, these tests assess the correctness of tool results against known expected outputs.

## Test Files

- `generate_esql.ts` - Evaluates the ESQL query generation tool against a test dataset

## Directory Structure

```
eval/
├── generate_esql.ts           # ESQL generation evaluation tests
├── config.stateful.ts         # Stateful deployment config (for eval tests)
└── README.md                  # This file
```

## Running the Tests

### Prerequisites

From the root of the Kibana repository:

```bash
yarn kbn bootstrap
```

also make sure to configure valid connector in your kibana.dev.yml file

### Option 2: Run Server and Tests Separately (Recommended for Development)

This approach is more efficient during development as you can keep the server running and rerun tests multiple times.

**Terminal 1 - Start the test server:**

```bash
cd x-packl
node scripts/functional_tests_server.js --config platform/test/onechat_api_integration/eval/config.stateful.ts

```

**Terminal 2 - Run the tests:**

```bash
yarn test:ftr:runner --config x-pack/platform/test/onechat_api_integration/eval/config.stateful.ts

```
