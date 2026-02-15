# @kbn/evals-suite-obs-ai-assistant

Evaluation test suites for the Observability AI Assistant, built on top of [`@kbn/evals`](../../../platform/packages/shared/kbn-evals/README.md).

## Overview

This package contains evaluation tests for the Observability AI Assistant, covering key features such as alerts, APM, ES|QL, knowledge base, connectors and more.
For general information about writing evaluation tests, configuration, and usage, see the main [`@kbn/evals` documentation](../../../platform/packages/shared/kbn-evals/README.md).

## Running Evaluations

### Start Scout Server

Start Scout server:

```bash
node scripts/scout.js start-server --arch stateful --domain classic
```

> The Scout server Kibana instance is accessible at <http://localhost:5620>. This may be useful if you want to query evaluation results for further analysis.

### Run Evaluations

Run evaluations using the following base command:

```bash
EVALUATION_CONNECTOR_ID=llm-judge-connector-id \
  node scripts/playwright test \
  --config x-pack/solutions/observability/packages/kbn-evals-suite-obs-ai-assistant/test/scout/ui/playwright.config.ts
```

#### Configuration Options

**Environment Variables:**

- **`EVALUATION_CONNECTOR_ID`** (required): Connector ID for the LLM judge
- **`EVALUATION_REPETITIONS`**: Number of times to repeatedly evaluate each example (e.g., `3`)
- **`USE_QUALITATIVE_EVALUATORS`**: Enable additional evaluators for Correctness (Factuality, Relevance, Sequence Accuracy) and Groundedness (Hallucination) (defaults to `false`)
- **`SCENARIO_REPORTING`**: Enable scenario-grouped reporting that aggregates datasets by scenario prefix (defaults to `false`)

**Playwright Options:**

- Add test file path to evaluate specific scenarios (e.g. run only alert scenarios by adding `evals/alerts/alerts.spec.ts`)
- Use `--project="my-connector"` to evaluate a specific model/connector

**Example with all options:**

```bash
# Running alerts scenarios
EVALUATION_REPETITIONS=3 \
USE_QUALITATIVE_EVALUATORS=true \
SCENARIO_REPORTING=true \
EVALUATION_CONNECTOR_ID=llm-judge-connector-id \
  node scripts/playwright test \
  --config x-pack/solutions/observability/packages/kbn-evals-suite-obs-ai-assistant/test/scout/ui/playwright.config.ts \
    evals/alerts/alerts.spec.ts \
  --project="my-connector" \
```

### Running Evaluations with Observability Agent (Agent Builder)

The evaluation suite supports running evaluations against both the Obs AI Assistant API and the Agent Builder API. This allows engineers to evaluate the Observability Agent early in the migration process.

#### Client Selection

Use the `EVALUATION_CLIENT` environment variable to specify which client to use:

- `obs_ai_assistant` (default): Uses the Obs AI Assistant API
- `agent_builder`: Uses the Agent Builder API

When using `agent_builder`, you can optionally specify which agent to invoke using the `AGENT_BUILDER_AGENT_ID` environment variable (defaults to the default agent).

#### Local Setup for Agent Builder Evaluations

The Scout server **cannot be used for Observability Agent evaluations**, because the Observability Agent requires a feature flag enabled at Kibana start time. Instead, run evaluations against a local Kibana instance:

**1. Enable the Observability Agent feature flag**

Add the following to your Kibana config file (e.g., `config/kibana.dev.yml`):

```yaml
feature_flags.overrides:
  observabilityAgent.enabled: true
```

**2. Start Kibana without base path**

```bash
yarn start --no-base-path
```

> The APM synthrace client fixture requires Kibana to run without a base path.

**3. Configure local Scout server**

Create `.scout/servers/local.json` with the following content:

```json
{
  "serverless": false,
  "isCloud": false,
  "hosts": {
    "kibana": "http://localhost:5601/",
    "elasticsearch": "http://localhost:9200/"
  },
  "auth": {
    "username": "elastic",
    "password": "changeme"
  }
}
```

**4. Run evaluations**

```bash
EVALUATION_REPETITIONS=1 \
EVALUATION_CLIENT="agent_builder" \
AGENT_BUILDER_AGENT_ID="observability.agent" \
EVALUATION_CONNECTOR_ID="your-connector-id" \
  node scripts/playwright test \
  --config x-pack/solutions/observability/packages/kbn-evals-suite-obs-ai-assistant/test/scout/ui/playwright.config.ts \
    evals/esql/esql.spec.ts \
  --project="your-connector" \
  --debug
```

#### Important Notes

- Current evaluation criteria are designed for the Obs AI Assistant and may not be fully applicable to the Observability Agent due to differences in tool implementations (e.g., knowledge base is now a tool rather than returned via the `context` tool, alerts tool behavior differs)
- The Agent Builder client implementation and infrastructure are ready for when Agent-specific evaluation criteria are developed

### Evaluation Reporting

The evaluation framework supports two reporting modes:

- **Default (verbose)**: Shows detailed per-dataset statistics. Useful for comparing variations within scenarios (e.g., comparing "alerts: critical" vs "alerts: warning").
- **Scenario-grouped** (`SCENARIO_REPORTING=true`): Aggregates datasets into scenario-level statistics. Useful for high-level overview across different scenarios (e.g., alerts, esql, apm).

**Dataset Naming Convention**: For scenario-grouped reporting, datasets must be named `"scenario: dataset-name"` (e.g., "alerts: critical", "esql: simple queries"). Any dataset not matching this pattern will be categorized under "Other". Always use this format when adding new test cases.

#### Retrieving Evaluation Scores from Elasticsearch

Evaluation results are stored in the .kibana-evaluations data stream on the Elasticsearch cluster your Scout configuration points to (defaulting to http://localhost:9220). For on-demand analysis, you can query this data stream using the Kibana instance at http://localhost:5620.

##### Useful Queries

> You must replace the `${run_id}` parameter in these queries with an actual evaluation `run_id` to retrieve data.

**Get evaluator scores per dataset (replicating in-terminal evaluation results):**

```bash
POST /_query?format=txt
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
    BY dataset.name
| SORT dataset.name
| LIMIT 100
    """
}
```

**Get evaluator scores per scenario (replicating in-terminal results when `SCENARIO_REPORTING=true`):**

```bash
POST /_query?format=txt
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
    BY scenario
| SORT scenario
| LIMIT 100
    """
}
```

**View performance ratings for each scenario in the evaluation run based on performance matrix heuristics:**

```bash
POST /_query?format=txt
{
  "query": """
FROM .kibana-evaluations
| WHERE run_id == "${run_id}"
| DISSECT dataset.name "%{scenario}: %{rest}"
| EVAL mean_dataset_score = MV_AVG(evaluator.scores)
| STATS
    criteria_score = AVG(mean_dataset_score) WHERE evaluator.name == "Criteria"
    BY scenario
| EVAL rating = CASE(
    criteria_score >= 0 and criteria_score < 0.45, "Poor",
    criteria_score < 0.75, "Good",
    criteria_score < 0.84, "Great",
    criteria_score <= 1, "Excellent",
    "Invalid"
)
| SORT scenario
| LIMIT 100
    """
}
```

## AI Insights Evaluations

For setup, prerequisites, and instructions on running AI Insights evaluations, see the [AI Insights README](./ai_insights/README.md).
