# Setup Guide: Running Semantic Log Search Evals

Practical guide for running semantic log search evaluations from scratch.

## Prerequisites

- Node version from `.nvmrc` installed
- `yarn kbn bootstrap` executed
- A connector id, for every run. The retrieval arms put no model in the loop, but they still execute
  the tools through the agent-builder API with a `connector_id`, and the eval CLI requires
  `--model` / `--judge` to build its config. A connector that cannot actually reach a model is
  enough for the retrieval arms.
- **A connector that works, for the agent arms.** They call `converse()`, so all three fail with a
  401 if the connector has no usable credential. In practice that means EIS plus CCM enabled
  (Step 0), because the repo's only other connector points at OpenRouter with a placeholder key.
- `KIBANA_TESTING_AI_CONNECTORS` exported in **every** terminal that runs `evals scout` or
  `evals run` (Step 2).

## Quick Start (Retrieval Evals Only)

The retrieval arms run no model, so results do not depend on a judge, but a connector is still
required (see Prerequisites):

```bash
# 1. Start Scout stack
node scripts/evals scout

# 2. In another terminal, seed the corpus
node scripts/synthtrace sigevents \
  --target=http://elastic:changeme@localhost:9220 \
  --kibana=http://elastic:changeme@localhost:5620 \
  --scenarioOpts="scenario=postgres_timeout,seed=42" \
  --from=now-2h --to=now --clean

# 3. Run retrieval evals (no connectors needed for this)
node scripts/evals run \
  --config x-pack/solutions/observability/packages/kbn-evals-suite-semantic-log-search/playwright.config.ts \
  --grep "retrieval" \
  --model claude-sonnet-4-5-connector \
  --judge claude-sonnet-4-5-connector
```

## Full Setup (Including Agent Evals)

Agent evals require EIS connectors for token counting and latency measurement.

### Step 1: Initialize evals configuration

```bash
node scripts/evals init
```

This command:
- Fetches available EIS models
- Caches connector definitions in `~/.elastic/eis-connectors-cache.json`
- **Prints an `export` command you MUST run**

### Step 2: Export connectors (CRITICAL)

After `init` completes, it prints something like:

```
Done! Run the following to export connectors to your shell:

  export KIBANA_TESTING_AI_CONNECTORS="eyJlaXMtYW50..."
```

**This variable is needed by two separate processes, and missing it in the second one is the most
confusing failure in this whole setup:**

1. `node scripts/evals scout`, so Kibana preconfigures the connectors.
2. **`node scripts/evals run`, so the eval harness knows the connectors exist.**

`getAvailableConnectors()` (in `@kbn/gen-ai-functional-testing`, called from
`createPlaywrightEvalsConfig`) reads this variable, and when it is absent it falls back to
`config/kibana.dev.yml`. That file defines only `claude-sonnet-4-5-connector`, so the run aborts
with:

```
Error: Evaluation connector id eis-anthropic-claude-4-5-sonnet was not found,
pick one from claude-sonnet-4-5-connector
```

This message is about the harness's own environment, **not** about Kibana. You can be looking at 38
connectors in Kibana and still get it. Export the variable in whatever terminal runs the evals.

Export from the cache (works in any terminal):

```bash
export KIBANA_TESTING_AI_CONNECTORS=$(cat ~/.elastic/eis-connectors-cache.json | python3 -c "import sys,json,base64; print(base64.b64encode(json.dumps(json.load(sys.stdin)['connectors']).encode()).decode())")
```

Verify it worked:

```bash
echo $KIBANA_TESTING_AI_CONNECTORS | base64 -d | python3 -c 'import sys,json; print(f"Connectors: {len(json.load(sys.stdin))}")'
# Should print: Connectors: 37 (or similar)
```

### Step 3: Start Scout (SAME TERMINAL as export)

**Important:** Run this in the **same terminal** where you exported the variable:

```bash
node scripts/evals scout
```

When Scout starts, you should see:

```
info 37 connector(s) will be preconfigured in Kibana
info Running: node scripts/scout.js start-server ...
```

If you see `KIBANA_TESTING_AI_CONNECTORS is not set`, the export didn't work.

### Step 4: Seed the corpus (new terminal)

```bash
node scripts/synthtrace sigevents \
  --target=http://elastic:changeme@localhost:9220 \
  --kibana=http://elastic:changeme@localhost:5620 \
  --scenarioOpts="scenario=postgres_timeout,seed=42" \
  --from=now-2h --to=now --clean
```

**Important:**
- Use `:9220` (Scout ES), not `:9200` (dev ES)
- `--clean` deletes the previous data stream
- The seed `42` is important for ground truth reproducibility

### Step 5: Run evals

Both commands below assume `KIBANA_TESTING_AI_CONNECTORS` is exported **in this terminal** (Step 2)
and that CCM is enabled (Step 0 below, or the 401 entry in Troubleshooting). `--suite` works as
well as `--config`; it rediscovers the config when the Buildkite metadata does not list the suite.

**Retrieval evals** (no LLM in the loop, ~15 min at `concurrency: 1`):

```bash
node scripts/evals run \
  --suite semantic-log-search --grep "retrieval" \
  --export-profile local \
  --project eis-anthropic-claude-4-5-sonnet --judge eis-anthropic-claude-4-5-sonnet
```

**Agent evals** (three arms through `converse()`, real model spend):

```bash
node scripts/evals run \
  --suite semantic-log-search --grep "agent" \
  --export-profile local \
  --project eis-anthropic-claude-4-5-sonnet --judge eis-anthropic-claude-4-5-sonnet
```

`--project` is an alias for `--model`. Drop `--grep` to run both suites in one go.

**Which connector to pass.** Use an `eis-*` id. The other option the harness may offer,
`claude-sonnet-4-5-connector`, comes from `config/kibana.dev.yml` and calls **OpenRouter**, which
needs an OpenRouter key in `config.json` that the repo ships as `REPLACE_ME`. Unless you personally
have one, EIS is the working path.

### Step 0: Enable CCM (needed once per cluster, before the agent arms)

Easy to miss, because retrieval passes without it and only the agent arms fail. The `eis-*`
connectors are **hidden from Kibana until CCM is on**: before enabling it this cluster reported 1
connector and 0 `chat_completion` endpoints; after, 38 and 40.

```bash
CCM_KEY=$(python3 -c "import json;print(json.load(open('$HOME/.elastic/eis-ccm-key.json'))['key'])")
curl -X PUT -u elastic:changeme "http://localhost:9220/_inference/_ccm" \
  -H 'Content-Type: application/json' -d "{\"api_key\": \"$CCM_KEY\"}"

curl -s -u elastic:changeme "http://localhost:9220/_inference/_ccm"   # want {"enabled":true}
```

If `~/.elastic/eis-ccm-key.json` is missing, `node scripts/evals init` fetches it, with Vault
access.

## Understanding Results

At the end of the run, you'll see a metrics table with one row group per arm.

**Key metrics:**
- **Precision@10**: Proportion of top 10 results that are relevant (higher is better)
- **Recall**: Proportion of the labelled relevant messages found (0-1, higher is better)
- **Hard Negatives@10**: Trap messages (healthy logs with similar vocabulary) in top 10 (lower is better)
- **Distinct Relevant Messages@10**: Unique relevant messages in top 10 (higher is better)
- **Weighted Precision@10**: Precision weighted by document count (higher is better)
- **Retrieval Latency**: Wall-clock fetch-to-parsed, in milliseconds (lower is better)

### One recorded run

Means over the 8 queries of `sigevents_postgres_timeout`, one repetition, both arms in the same
run. Provenance: ES and Kibana 9.6.0 (Scout, trial licence), 2,447 in-window documents of 2,632
seeded, `.rerank-v1` already imported and deployed, connector `claude-sonnet-4-5-connector`.
Treat these as one observation, not a baseline: see the reproducibility note in the
[README](./README.md), and note that a cold reranker changes latency completely.

| Metric | `keyword` | `semantic` |
|---|---|---|
| Precision@10 | 0.18 | **0.31** |
| Recall | 0.59 | **0.91** |
| Distinct Relevant Messages@10 | 1.75 | **3.13** |
| Hard Negatives@10 (lower better) | 1.00 | **0.75** |
| R-Precision | 0.41 | **0.71** |
| nDCG@10 | 0.55 | **0.77** |
| MRR | 0.77 | **1.00** |
| Weighted Precision@10 | **0.66** | 0.39 |
| Retrieval Latency (see caveat) | **78 ms** | 8,316 ms |
| Count Sanity (0 = contract held) | 0 | 0 |

> **Ignore the latency row.** It was measured at concurrency 5, so it includes queueing against a
> reranker that saturates at one in-flight request, and it sits at an unknown point on the
> inference cache curve. Repeat runs of this same corpus produced means of 8,316 ms, then
> 2,315 ms, then 71.88 ms with identical quality scores, purely from cache warming. A cold,
> never-before-asked question on this corpus measured **~10.9 s**. Read
> [Measuring latency properly](#measuring-latency-properly) before quoting any figure.
>
> The quality columns are unaffected by any of this: they were stable across all three runs.

Two results deserve attention rather than celebration:

- **Weighted Precision inverts.** The semantic arm wins every rank-based metric and loses the
  document-weighted one. That is consistent with it doing its job: it surfaces relevant *rare*
  patterns, which by definition cover few documents, while the keyword arm ranks by frequency and
  is therefore flattered by a document-weighted denominator. Its median (0.21) sits well below its
  mean (0.39), so the distribution is skewed by a few high-coverage answers.
- **Latency differs by two orders of magnitude**, 8.3 s against 78 ms, with the reranker already
  warm. Per-query spread was 2.8 s to 15.4 s. Whatever the interactive budget turns out to be,
  this is the number that has to move.

## Measuring latency properly

**Read this before quoting any latency figure. Repeating a run does not converge on the truth; it
converges on the cache.**

The reranker deployment carries an inference cache keyed on the (query, document) pairs it scores,
and the suite asks the same questions over the same corpus every time. Measured on one cluster:

| | Latency |
|---|---|
| A question the suite has already asked | **114 to 133 ms** |
| A question never asked before | **10,752 to 10,977 ms** |

That is roughly 90x, and the deployment stats confirm why: `cache_size: 738.1mb` with
`cache_hit_count: 1342` of `inference_count: 2208`, so 61% of inferences never reached the model.
A suite mean of 71.88 ms and a suite mean of 8,316 ms were both produced on this corpus, and
neither is the cost of answering a user's question.

Check where you are before believing a number:

```bash
curl -s -u elastic:changeme "http://localhost:9220/_ml/trained_models/.rerank-v1/_stats" | \
  python3 -c "
import sys,json; n=json.load(sys.stdin)['trained_model_stats'][0]['deployment_stats']['nodes'][0]
print('inferences:', n.get('inference_count'), 'cache hits:', n.get('inference_cache_hit_count'))"
```

**To measure the cold path**, which is what a user experiences, either ask questions the cluster
has not seen (edit the corpus queries, or add a unique token to each) or re-seed so the candidate
text changes. Only the first run against fresh data is a cold measurement. If your Elasticsearch
build lets you set `cache_size: 0` on the deployment, that is the cleaner lever.

The suite pins `concurrency: 1` for the retrieval arms, which removes queueing between examples.
Two further things it cannot control from code:

**1. Stop the reranker scaling from zero.** `.rerank-v1-elasticsearch` ships with
`min_number_of_allocations: 0`, so the first queries of a run pay allocation spin-up that has
nothing to do with retrieval cost:

```bash
curl -X PUT -u elastic:changeme "http://localhost:9220/_inference/rerank/.rerank-v1-elasticsearch" \
  -H 'Content-Type: application/json' \
  -d '{"service":"elasticsearch","service_settings":{"model_id":".rerank-v1","num_threads":1,
       "adaptive_allocations":{"enabled":true,"min_number_of_allocations":1,
       "max_number_of_allocations":32}}}'
```

Confirm it is deployed, not merely defined. On a cold cluster the model is absent until first use,
so this may report nothing until a query has run:

```bash
curl -s -u elastic:changeme "http://localhost:9220/_ml/trained_models/.rerank-v1/_stats" | \
  python3 -c "import sys,json; s=json.load(sys.stdin)['trained_model_stats'][0]; print(s.get('deployment_stats',{}).get('state','not deployed'))"
```

**2. Repeat, and read the spread rather than the mean:**

```bash
node scripts/evals run --suite semantic-log-search --grep "retrieval" \
  --repetitions 3 --project <connector-id> --judge <connector-id>
```

Two remaining limits to state alongside any figure you report. Latency is **not normalised by
candidate count**: the cross-encoder scores every candidate, so a corpus yielding more patterns
costs proportionally more, and the service does not report how many were scored. And a cold
reranker changes the number entirely: the first call after an idle period can exceed 30 s, which is
a model-loading cost rather than a query cost.

## Troubleshooting

### "KIBANA_TESTING_AI_CONNECTORS is not set"

You started Scout without the variable exported. You must:
1. Stop Scout (`Ctrl+C`)
2. Export the variable in that same terminal
3. Restart Scout

### Connectors show 0, or only 1, in Kibana

Two different causes:

- **0 connectors**: Scout started before the export. Fix as above.
- **Exactly 1, a `.gen-ai` with a UUID id**: Scout got the variable, but **CCM is off**, so the 37
  `eis-*` connectors are filtered out and only the `kibana.dev.yml` OpenRouter connector remains.
  Enable CCM (Step 0). Verified on this stack: 1 connector and 0 `chat_completion` endpoints before,
  38 and 40 after.

```bash
curl -s -u elastic:changeme "http://localhost:5620/api/actions/connectors" -H 'kbn-xsrf: true' | \
  python3 -c "
import sys,json
d=json.load(sys.stdin)
print(len(d),'connectors;','eis-*:',len([c for c in d if c['id'].startswith('eis-')]))"
```

### "Model .rerank-v1 not available"

On a fresh cluster this is expected rather than broken. The `.rerank-v1-elasticsearch` endpoint
ships preconfigured, but with `adaptive_allocations.min_number_of_allocations: 0`, so the
`.rerank-v1` trained model behind it does not exist until something first asks for a ranking.
`GET _ml/trained_models/.rerank-v1` returns **404** until then. Check status with:

```bash
curl -s -u elastic:changeme "http://localhost:9220/_ml/trained_models/.rerank-v1?include=definition_status" | \
  python3 -c "import sys,json; d=json.load(sys.stdin); c=d.get('trained_model_configs'); print('fully_defined:', c[0].get('fully_defined', False)) if c else print('not imported yet:', d.get('error',{}).get('reason','unknown'))"
```

The import itself has been measured at ~21 s, before deployment even starts, which is why the
first semantic call after any idle period can exceed a naive timeout. The service classifies that
case as `inference_not_ready` rather than `timeout`, and the advice is to retry, not to narrow the
query.

Once `fully_defined: True`, deploy it:

```bash
curl -X POST -u elastic:changeme "http://localhost:9220/_ml/trained_models/.rerank-v1/deployment/_start" -H 'Content-Type: application/json' -d '{"number_of_allocations": 1}'
```

### Agent evals fail with "401 Unauthorized" or "Missing Authentication header"

**Two different causes produce this identical message. Check which connector you ran with before
doing anything, or you will spend an hour on the wrong one.**

```bash
curl -s -u elastic:changeme "http://localhost:5620/api/actions/connectors" -H 'kbn-xsrf: true' | \
  python3 -c "
import sys,json
for c in json.load(sys.stdin):
    print(c['connector_type_id'], c['id'], (c.get('config') or {}).get('apiUrl',''))"
```

**Cause 1: a `.gen-ai` connector pointing at OpenRouter, with the placeholder API key.**

If the `apiUrl` is `https://openrouter.ai/...`, Elasticsearch and CCM are irrelevant: OpenRouter is
rejecting the key. `config.json` ships `openrouter.apiKey` as `REPLACE_ME`, and the placeholder is
a *present* secret, so Kibana reports `is_missing_secrets: false` and the failure only surfaces as
a 401 at call time. Fix it by supplying the real key:

```bash
node scripts/evals init config    # prompts for "OpenRouter API key", writes it to config.json
```

The file is `x-pack/platform/packages/shared/kbn-evals/scripts/vault/config.json`, and it is
gitignored, so you can also edit `openrouter.apiKey` in place. Retrieval arms are unaffected by
this, because they never call a model, which is why they pass while the agent arms fail.

**Cause 2: an EIS connector (`.inference`, `eis-*`) without CCM enabled.**

EIS connectors need Cloud Connected Mode on Elasticsearch. Everything below applies to this case
only. Note the ordering trap: while CCM is off, the `eis-*` connectors do not appear in Kibana at
all, so you cannot select one to escape Cause 1 until CCM is on. Enable CCM first, then switch
connector.

### "Evaluation connector id eis-... was not found, pick one from claude-sonnet-4-5-connector"

Nothing to do with Kibana, and it happens even when Kibana lists all 38 connectors. The **eval
harness** builds its own list from `KIBANA_TESTING_AI_CONNECTORS`, and falls back to
`config/kibana.dev.yml` when that is unset. Export the variable in the terminal running
`node scripts/evals run`, not only in the one running Scout. See Step 2.

**Check if CCM is enabled:**

```bash
curl -s -u elastic:changeme "http://localhost:9220/_inference/_ccm"
# Should return: {"enabled":true}
```

**If CCM is disabled, enable it manually:**

```bash
# Get the CCM API key from cache
CCM_KEY=$(cat ~/.elastic/eis-ccm-key.json | python3 -c "import json,sys; print(json.load(sys.stdin)['key'])")

# Enable CCM on Scout ES
curl -X PUT -u elastic:changeme "http://localhost:9220/_inference/_ccm" \
  -H 'Content-Type: application/json' \
  -d "{\"api_key\": \"$CCM_KEY\"}"
```

**Wait for EIS endpoints to be available:**

```bash
# Check EIS chat_completion endpoints
curl -s -u elastic:changeme "http://localhost:9220/_inference/_all" | \
  python3 -c "import json,sys; data=json.load(sys.stdin); eis=[e for e in data.get('endpoints',[]) if e.get('task_type')=='chat_completion' and e.get('service')=='elastic']; print(f'EIS endpoints: {len(eis)}')"
# Should print: EIS endpoints: 40 (or similar)
```

**If `~/.elastic/eis-ccm-key.json` doesn't exist:**

You need to run `node scripts/evals init` with Vault access to fetch the CCM API key.

### Port conflicts

If `:9220` or `:5620` are in use:

```bash
lsof -ti:9220 | xargs kill -9
lsof -ti:5620 | xargs kill -9
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│ Dev Stack (don't touch during evals)                    │
│ - ES :9200                                              │
│ - Kibana :5601                                          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Scout Stack (for evals)                                 │
│ - ES :9220 ← corpus seeded here                         │
│ - Kibana :5620 ← evals connect here                     │
│ - EIS connectors (if KIBANA_TESTING_AI_CONNECTORS set)  │
└─────────────────────────────────────────────────────────┘
```

## References

- [README](./README.md) - Metrics and ground truth details
- [Issue #6159](https://github.com/elastic/observability-dev/issues/6159) - Evaluation objectives
