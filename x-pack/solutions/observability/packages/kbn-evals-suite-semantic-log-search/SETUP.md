# Setup Guide: Running Semantic Log Search Evals

Practical guide for running semantic log search evaluations from scratch.

## Prerequisites

- Node version from `.nvmrc` installed
- `yarn kbn bootstrap` executed
- A connector, for every run. The retrieval arms put no model in the loop, but they still execute
  the tools through the agent-builder API with a `connector_id`, and the eval CLI requires
  `--model` / `--judge` to build its config. EIS connectors are only needed for the agent arms'
  token and latency evaluators.

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

**You MUST copy and run this export command in the same terminal where you'll run Scout.**

Alternatively, export from the cache:

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

**Retrieval evals** (no LLM in the loop):

```bash
node scripts/evals run \
  --config x-pack/solutions/observability/packages/kbn-evals-suite-semantic-log-search/playwright.config.ts \
  --grep "retrieval" \
  --model eis-anthropic-claude-4-5-sonnet \
  --judge eis-anthropic-claude-4-5-sonnet
```

**Agent evals** (includes tokens/latency, requires EIS connectors):

```bash
node scripts/evals run \
  --config x-pack/solutions/observability/packages/kbn-evals-suite-semantic-log-search/playwright.config.ts \
  --model eis-anthropic-claude-4-5-sonnet \
  --judge eis-anthropic-claude-4-5-sonnet
```

## Understanding Results

At the end of the run, you'll see a metrics table:

```
╔═════════════════════════════════════════════════════════╤════╤═══════════════════════════════╤═══════════════════╤══════════════╗
║ Dataset                                                 │  # │ Distinct Relevant Messages@10 │ Hard Negatives@10 │       Recall ║
╟─────────────────────────────────────────────────────────┼────┼───────────────────────────────┼───────────────────┼──────────────╢
║ semantic-log-search-sigevents_postgres_timeout-semantic │  5 │                    mean: 3.60 │        mean: 0.20 │   mean: 0.94 ║
║ semantic-log-search-sigevents_postgres_timeout-keyword  │  5 │                    mean: 1.60 │        mean: 0.60 │   mean: 0.42 ║
╚═════════════════════════════════════════════════════════╧════╧═══════════════════════════════╧═══════════════════╧══════════════╝
```

**Key metrics:**
- **Precision@10**: Proportion of top 10 results that are relevant (higher is better)
- **Recall**: Proportion of all relevant messages found (0-1, higher is better)
- **Hard Negatives@10**: Trap messages (healthy logs with similar vocabulary) in top 10 (lower is better)
- **Distinct Relevant Messages@10**: Unique relevant messages in top 10 (higher is better)
- **Weighted Precision@10**: Precision weighted by document count (higher is better)

**Expected results:**
- `keyword` arm: Lower precision (~0.16), moderate recall (~0.42)
- `semantic` arm: Better precision (~0.36), higher recall (~0.94), fewer hard negatives

## Troubleshooting

### "KIBANA_TESTING_AI_CONNECTORS is not set"

You started Scout without the variable exported. You must:
1. Stop Scout (`Ctrl+C`)
2. Export the variable in that same terminal
3. Restart Scout

### Connectors show 0 in Kibana

Same issue as above - Scout started before the export.

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

This means CCM (Cloud Connected Mode) is not enabled on Elasticsearch. EIS connectors require CCM.

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
