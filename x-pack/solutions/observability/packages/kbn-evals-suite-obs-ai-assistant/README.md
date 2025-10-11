# @kbn/evals-suite-obs-ai-assistant

Evaluation test suites for the Observability AI Assistant, built on top of [`@kbn/evals`](../../../platform/packages/shared/kbn-evals/README.md).

## Overview

This package contains evaluation tests for the Observability AI Assistant functionality, including alerts, APM, ES|QL, knowledge base, connectors, and more.

For general information about writing evaluation tests, configuration, and usage, see the main [`@kbn/evals` documentation](../../../platform/packages/shared/kbn-evals/README.md).

## Running Evaluations

### Start Scout Server

Start Scout server:

```bash
node scripts/scout.js start-server --stateful
```

### Run Evaluations

Then run the evaluations:

```bash
# Run all Observability AI Assistant evaluations for all available connectors and specify LLM judge (we evaluate all LLMs with  Gemini 2.5 Pro judge)
EVALUATION_CONNECTOR_ID=llm-judge-connector-id node scripts/playwright test --config x-pack/solutions/observability/packages/kbn-evals-suite-obs-ai-assistant/playwright.config.ts

# Evaluate specific scenarios
EVALUATION_CONNECTOR_ID=llm-judge-connector-id node scripts/playwright test --config x-pack/solutions/observability/packages/kbn-evals-suite-obs-ai-assistant/playwright.config.ts evals/alerts/alerts.spec.ts

# Run with specific connector (specify --project)
EVALUATION_CONNECTOR_ID=llm-judge-connector-id node scripts/playwright test --config x-pack/solutions/observability/packages/kbn-evals-suite-obs-ai-assistant/playwright.config.ts --project="my-connector"

# Repeatedly evaluate every example by specifying the number of repetitions
EVALUATION_REPETITIONS=3 EVALUATION_CONNECTOR_ID=llm-judge-connector-id node scripts/playwright test --config x-pack/solutions/observability/packages/kbn-evals-suite-obs-ai-assistant/playwright.config.ts
```
