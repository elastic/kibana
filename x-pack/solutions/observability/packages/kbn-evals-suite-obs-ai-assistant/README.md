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
# Run all Observability AI Assistant evaluations for all available connectors and specify LLM judge (we evaluate all LLMs with Gemini 2.5 Pro judge)
EVALUATION_CONNECTOR_ID=llm-judge-connector-id \
  node scripts/playwright test \
  --config x-pack/solutions/observability/packages/kbn-evals-suite-obs-ai-assistant/playwright.config.ts

# Evaluate specific scenarios
EVALUATION_CONNECTOR_ID=llm-judge-connector-id \
  node scripts/playwright test \
  --config x-pack/solutions/observability/packages/kbn-evals-suite-obs-ai-assistant/playwright.config.ts \
  evals/alerts/alerts.spec.ts

# Run with specific connector (specify --project)
EVALUATION_CONNECTOR_ID=llm-judge-connector-id \
  node scripts/playwright test \
  --config x-pack/solutions/observability/packages/kbn-evals-suite-obs-ai-assistant/playwright.config.ts \
  --project="my-connector"

# Repeatedly evaluate every example by specifying the number of repetitions
EVALUATION_REPETITIONS=3 \
EVALUATION_CONNECTOR_ID=llm-judge-connector-id \
  node scripts/playwright test \
  --config x-pack/solutions/observability/packages/kbn-evals-suite-obs-ai-assistant/playwright.config.ts

# Enable additional evaluators for Correctness (Factuality, Relevance, Sequence Accuracy) and Groundedness (Hallucination)
USE_QUALITATIVE_EVALUATORS=true \
EVALUATION_CONNECTOR_ID=llm-judge-connector-id \
  node scripts/playwright test \
  --config x-pack/solutions/observability/packages/kbn-evals-suite-obs-ai-assistant/playwright.config.ts

# Enable scenario-grouped reporting (aggregates datasets by scenario prefix)
SCENARIO_REPORTING=true \
EVALUATION_CONNECTOR_ID=llm-judge-connector-id \
  node scripts/playwright test \
  --config x-pack/solutions/observability/packages/kbn-evals-suite-obs-ai-assistant/playwright.config.ts
```

### Evaluation Reporting

The evaluation framework supports two reporting modes:

- **Default (verbose)**: Shows detailed per-dataset statistics. Useful for comparing variations within scenarios (e.g., comparing "alerts: critical" vs "alerts: warning").
- **Scenario-grouped** (`SCENARIO_REPORTING=true`): Aggregates datasets into scenario-level statistics. Useful for high-level overview across different scenarios (e.g., alerts, esql, apm).

**Dataset Naming Convention**: For scenario-grouped reporting to work properly, datasets should follow the pattern `"scenario: dataset-name"` (e.g., "alerts: critical", "esql: simple queries"). Datasets not following this pattern will be grouped under "Other".
When creating new test cases, follow the dataset naming format so the new evaluations are reported on correctly.
