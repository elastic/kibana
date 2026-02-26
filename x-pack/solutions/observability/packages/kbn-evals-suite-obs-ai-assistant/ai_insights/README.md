# AI Insights Evaluations

Evaluations for AI Insights, which assess the correctness of LLM-generated summaries for alerts and APM errors.
These evaluations support both qualitative (LLM-as-a-judge) and quantitative (trace-based) metrics.

For general information about writing evaluation tests, configuration, and usage, see the main [`@kbn/evals` documentation](../../../../../platform/packages/shared/kbn-evals/README.md).

## Prerequisites

### Snapshot Data

AI Insights replay now uses a GCS snapshot repository directly (`obs-ai-datasets/otel-demo/payment-service-failures`), so local `gcloud rsync` to `/tmp/repo` is no longer required.

Set `GCS_CREDENTIALS` before starting Scout. This environment variable must contain the full JSON service account credential string (not a file path):

```bash
export GCS_CREDENTIALS='{"type":"service_account",...}'
```

When `GCS_CREDENTIALS` is set, the `evals_tracing` Scout config writes it to a temporary file and injects `gcs.client.default.credentials_file` so Elasticsearch can access GCS snapshots through the keystore flow.

### Tracing Setup

To capture trace-based metrics (token usage, latency), you need to configure tracing exporters and run the EDOT Collector.

> **Important:** Use a **separate Elasticsearch cluster** for exporting traces. The AI Insights evaluations clean up observability data in the system under evaluation so that new scenarios can be recreated from a clean state. If evaluation traces are stored in the same cluster, this cleanup will also remove the traces that trace-based evaluators depend on, leading to inconsistent evaluation results and potentially affecting the AI Insights API responses themselves.

#### Step 1: Configure Tracing Exporters

Add the HTTP exporter to `kibana.dev.yml` so Kibana exports traces via OpenTelemetry:

```yaml
telemetry.tracing.exporters:
  - http:
      url: 'http://localhost:4318/v1/traces'
```

Optionally, include the Phoenix exporter if you want traces visible in a Phoenix UI:

```yaml
telemetry.tracing.exporters:
  - phoenix:
      base_url: 'https://<my-phoenix-host>'
      public_url: 'https://<my-phoenix-host>'
      project_name: '<my-name>'
      api_key: '<my-api-key>'
  - http:
      url: 'http://localhost:4318/v1/traces'
```

#### Step 2: Start EDOT Collector

Start the EDOT (Elastic Distribution of OpenTelemetry) Gateway Collector to receive and store traces. Ensure Docker is running, then execute:

```bash
# Point EDOT at a separate trace cluster (recommended)
ELASTICSEARCH_HOST=https://<username>:<password>@<trace-cluster-url> node scripts/edot_collector.js
```

The EDOT Collector receives traces from Kibana via the HTTP exporter and stores them in the specified Elasticsearch cluster, where they can be queried to extract non-functional metrics like token usage and latency.

You can optionally use non-default ports with `--http-port <port>` or `--grpc-port <port>`. If you change ports, update the exporter URL in `kibana.dev.yml` accordingly.

## Running Evaluations

### Start Scout Server

Start the Scout server with the built-in tracing config:

```bash
node scripts/scout start-server --arch stateful --domain classic --serverConfigSet evals_tracing
```

### Run Evaluations

Run evaluations using the evals CLI:

```bash
node scripts/evals run \
  --suite obs-ai-assistant/ai_insights \
  --evaluation-connector-id <connector-id> \
  --trace-es-url https://user:pass@my-trace-cluster:9200 \
  --project <connector-id>
```

#### CLI Options

| Flag                        | Description                                                                                             |
| --------------------------- | ------------------------------------------------------------------------------------------------------- |
| `--suite`                   | Suite ID to run (use `obs-ai-assistant/ai_insights` for AI Insights)                                    |
| `--evaluation-connector-id` | Connector ID for the LLM judge (required)                                                               |
| `--project`                 | Connector/model project to evaluate against                                                             |
| `--repetitions`             | Number of times to repeat each evaluation example (e.g., `3`)                                           |
| `--trace-es-url`            | URL of the Elasticsearch cluster where traces are stored (e.g., `https://user:pass@trace-cluster:9200`) |
| `--dry-run`                 | Preview the command without executing                                                                   |

You can also pass positional arguments to run specific test files (e.g., `alert_insight.spec.ts`):

```bash
node scripts/evals run \
  --suite obs-ai-assistant/ai_insights \
  --evaluation-connector-id <connector-id> \
  --project my-connector \
  alert_insight.spec.ts
```

### Collected Metrics

| Metric                       | Description                                                             |
| ---------------------------- | ----------------------------------------------------------------------- |
| **Quantitative Correctness** | Factuality, Relevance, and Sequence Accuracy scores from LLM-as-a-judge |
| **Input Tokens**             | Number of input tokens consumed per evaluation (trace-based)            |
| **Output Tokens**            | Number of output tokens generated per evaluation (trace-based)          |
| **Cached Tokens**            | Number of cached tokens used per evaluation (trace-based)               |
| **Latency**                  | Duration of the `ChatComplete` span used by the AI Inisghts             |
