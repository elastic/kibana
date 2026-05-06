# @kbn/evals-suite-observability-ai

Evaluation suite for Observability AI features, built on [`@kbn/evals`](../../../../platform/packages/shared/kbn-evals/README.md).

This package is separate from [`@kbn/evals-suite-obs-ai-assistant`](../kbn-evals-suite-obs-ai-assistant), which covers the legacy Observability AI Assistant. The evaluations here cover features built on the Agent Builder platform.

- **Suite ID:** `observability-ai`
- **CI Label:** `evals:observability-ai`

## Evaluations

| Directory                    | Client               | Description                                                              |
| ---------------------------- | -------------------- | ------------------------------------------------------------------------ |
| `evals/ai_insights/`         | `AiInsightClient`    | Correctness of LLM-generated insight summaries for alerts and APM errors |
| `evals/observability_agent/` | `AgentBuilderClient` | Observability Agent chat behavior                                        |

## Prerequisites

### Snapshot Data

AI Insights evaluations replay observability data from GCS snapshot repositories:

- `obs-ai-datasets/otel-demo/payment-service-failures` — payment service invalid token errors
- `obs-ai-datasets/otel-demo/payment-unreachable` — payment service unreachable from checkout (via the `paymentUnreachable` feature flag in the OTel demo)
- `obs-ai-datasets/otel-demo/kafka-queue-problems` — Kafka queue overload and consumer lag in fraud-detection (via the `kafkaQueueProblems` feature flag in the OTel demo)

Set `GCS_CREDENTIALS` before starting Scout. This must contain the full JSON service account credential string (not a file path):

```bash
export GCS_CREDENTIALS='{"type":"service_account",...}'
```

When `GCS_CREDENTIALS` is set, the `evals_tracing` Scout config writes it to a temporary file and injects `gcs.client.default.credentials_file` so Elasticsearch can access GCS snapshots through the keystore flow.

### Tracing Setup

To capture trace-based metrics (token usage, latency), configure tracing exporters and run the EDOT Collector.

> **Important:** Use a **separate Elasticsearch cluster** for exporting traces. Evaluations clean up observability data between scenarios. If traces are stored in the same cluster, this cleanup will also remove traces that trace-based evaluators depend on.

1. Add the HTTP exporter to `kibana.dev.yml`:

```yaml
telemetry.tracing.exporters:
  - http:
      url: 'http://localhost:4318/v1/traces'
```

Optionally, include the Phoenix exporter for a trace UI:

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

2. Start the EDOT Collector (Docker required):

If you use `node scripts/evals start`, EDOT is started automatically. Run this step only when using the separate-terminal/manual workflow.

Start the EDOT (Elastic Distribution of OpenTelemetry) Gateway Collector to receive and store traces. Ensure Docker is running, then execute:

```bash
# Point EDOT at a separate trace cluster (recommended)
ELASTICSEARCH_HOST=https://<username>:<password>@<trace-cluster-url> node scripts/edot_collector.js
```

The EDOT Collector receives traces from Kibana via the HTTP exporter and stores them in the specified Elasticsearch cluster, where they can be queried to extract non-functional metrics like token usage and latency.

You can optionally use non-default ports with `--http-port <port>` or `--grpc-port <port>`. If you change ports, update the exporter URL in `kibana.dev.yml` accordingly.

## Running Evaluations

### 1) One-time setup

```bash
node scripts/evals init
```

If you choose EIS/Cloud Connected Mode, `init` prints an export command for
`KIBANA_TESTING_AI_CONNECTORS`. Run that export in your shell before `start`/`run`.

### 2) Start full eval stack

Use `start` to launch the full stack (Scout server, EDOT collector, and EIS CCM) and run the suite.

```bash
node scripts/evals start \
  --suite observability-ai \
  --judge <connector-id> \
  --project <connector-id>
```

### 3) Iterative runs (without restart)

After the stack is running, use `run` for faster iteration on the full suite or specific specs.

Run the full suite:

```bash
node scripts/evals run \
  --suite observability-ai \
  --judge <connector-id> \
  --project <connector-id>
```

Run a specific evaluation:

```bash
node scripts/evals run \
  --suite observability-ai \
  --judge <connector-id> \
  --project <connector-id> \
  evals/ai_insights/alert_insight.spec.ts
```

### Alternative: separate terminals

If you prefer to manage services manually, start Scout in one terminal and run evals in another.

Terminal 1:

```bash
node scripts/scout start-server --arch stateful --domain classic --serverConfigSet evals_tracing
```

Terminal 2:

```bash
node scripts/evals run \
  --suite observability-ai \
  --judge <connector-id> \
  --project <connector-id>
```

### Stop background services

`node scripts/evals start` runs Scout and EDOT as background daemons.

```bash
node scripts/evals stop
```

Stop only one service:

```bash
node scripts/evals stop --service scout
node scripts/evals stop --service edot
```

### CLI Options

| Flag             | Description                                                                            |
| ---------------- | -------------------------------------------------------------------------------------- |
| `--suite`        | Suite ID (`observability-ai`)                                                          |
| `--judge`        | Connector ID for the LLM judge (required)                                              |
| `--project`      | Connector/model project to evaluate against                                            |
| `--repetitions`  | Number of times to repeat each example                                                 |
| `--trace-es-url` | Elasticsearch cluster for trace storage (e.g., `https://user:pass@trace-cluster:9200`) |
| `--dry-run`      | Preview without executing                                                              |

## Collected Metrics

| Metric                       | Description                                                             |
| ---------------------------- | ----------------------------------------------------------------------- |
| **Quantitative Correctness** | Factuality, Relevance, and Sequence Accuracy scores from LLM-as-a-judge |
| **Input Tokens**             | Number of input tokens consumed per evaluation (trace-based)            |
| **Output Tokens**            | Number of output tokens generated per evaluation (trace-based)          |
| **Cached Tokens**            | Number of cached tokens used per evaluation (trace-based)               |
| **Latency**                  | Duration of the `ChatComplete` span (trace-based)                       |
