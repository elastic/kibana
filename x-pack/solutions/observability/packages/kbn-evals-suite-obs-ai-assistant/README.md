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

> You can access the Scout server Kibana instance by accessing <http://localhost:5620>. This may be useful if you want to query evaluation results for further analysis.

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

#### Retrieving Evaluation Scores from Elasticseach

Evaluation results are stored in `.kibana-evaluations` data stream on the Elasticsearch cluster your Scout configuration is pointing too (default being <http://localhost:9220> and you can use <http://localhost:5620> to access Kibana). You can query the data stream if you wish to analyze evaluation results a run on-demand.

##### Useful Queries

> You will need to replace the ${run_id} parameter in the queries with an actual evaluation run id to get the data.

**Get evaluator scores per dataset (replicating in-terminal evaluation results):**

```bash
POST /_query?format=csv
{
  "query": """
FROM .kibana-evaluations
| WHERE run_id == "${run_id}"
| EVAL mean_dataset_score = MV_AVG(evaluator.scores)
| STATS
    criteria_score = AVG(mean_dataset_score) WHERE evaluator.name == "Criteria",
    groundedness_score = AVG(mean_dataset_score) WHERE evaluator.name == "Groundedness",
    factuality_score = AVG(mean_dataset_score) WHERE evaluator.name == "Factuality",
    relevance_score = AVG(mean_dataset_score) WHERE evaluator.name == "Relevance",
    sequence_accuracy_score = AVG(mean_dataset_score) WHERE evaluator.name == "Sequence Accuracy"
    BY run_id, dataset.name
| SORT dataset.name
| LIMIT 100
    """
}
```

**Get evaluator scores per scenario (replicating in-terminal results when `SCENARIO_REPORTING=true`):**

```bash
POST /_query?format=csv
{
  "query": """
FROM .kibana-evaluations
| WHERE run_id == "${run_id}"
| DISSECT dataset.name "%{scenario}: %{rest}"
| EVAL mean_dataset_score = MV_AVG(evaluator.scores)
| STATS
    criteria_score = AVG(mean_dataset_score) WHERE evaluator.name == "Criteria",
    groundedness_score = AVG(mean_dataset_score) WHERE evaluator.name == "Groundedness",
    factuality_score = AVG(mean_dataset_score) WHERE evaluator.name == "Factuality",
    relevance_score = AVG(mean_dataset_score) WHERE evaluator.name == "Relevance",
    sequence_accuracy_score = AVG(mean_dataset_score) WHERE evaluator.name == "Sequence Accuracy"
    BY run_id, scenario
| SORT scenario
| LIMIT 100
    """
}
```
