# @kbn/evals-suite-nightshift-investigations

Evaluation suite for [Nightshift investigations](../../plugins/nightshift_investigations).

The smoke and trace-only evals run by default, locally and in CI, when sandbox credentials are
available. Set `NIGHTSHIFT_DATASETS` to run just one. The smoke eval checks seed data loading and
score ingestion. The trace-only eval runs the real manual investigation workflow on file-based or
stored questions and persists its report, conversation and full agent trace. The
[ORCA benchmark](#orca-benchmark) runs the same investigation and judges on its own Scout server.

Investigation evals grade each run with five RCA judges and an `execution_success` score. A run
that ends without a conclusion scores 0 there but doesn't fail the eval on its own; the eval fails
when fewer than 80% of runs complete.

## Running the suite

```bash
node scripts/evals start --suite nightshift-investigations
```

`start` brings up Elasticsearch, Kibana and EDOT, then runs the suite. Later runs reuse those
services, so iteration is fast. Use `node scripts/evals run --suite nightshift-investigations`
when they are already up.

### Serverless by default

The suite runs against a local **serverless observability** Scout cluster (`scoutArch` /
`scoutDomain` in its [`evals.suites.json`](../../../../../.buildkite/pipelines/evals/evals.suites.json)
entry), locally and in CI. Serverless Elasticsearch runs in Docker, so Docker must be running;
Kibana starts with `--serverless=oblt` on `5620`. To run on stateful instead:

```bash
node scripts/evals start --suite nightshift-investigations --scout-arch stateful
```

Switching arch restarts Scout. Both arches run the smoke eval's snapshot seeding: serverless Elasticsearch has no keystore, so `kbn-es` passes `GCS_CREDENTIALS` to it as a file secret instead.

Serverless Elasticsearch always binds transport ports `9300`–`9302`. A development Elasticsearch started with `yarn es snapshot` (as the `local` profile below needs) also takes `9300`, so give it another transport port: `yarn es snapshot --license trial -E transport.port=9400`.

### Choosing where scores are recorded

The `--profile` flag decides which cluster records the run. Refer to [`--profile` in the `@kbn/evals` README](../../../../platform/packages/shared/kbn-evals/README.md#profiles) for the full list of profiles and how each one resolves its credentials. The two that matter most here:

| Goal                                 | Command                                                                          |
| ------------------------------------ | -------------------------------------------------------------------------------- |
| Keep scores on your own machine      | `node scripts/evals start --suite nightshift-investigations --profile local`     |
| Publish scores to the golden cluster | `node scripts/evals start --suite nightshift-investigations --profile dev-vault` |

`dev-vault` publishes to the golden cluster, which is what the weekly pipeline writes to and what the dashboards read, so use it when a run needs to be comparable against the weekly baseline. It reads its credentials from Vault at runtime, handling the login itself and opening a browser if your Vault session has expired.

`local` records scores on your own development Elasticsearch and Kibana, so start those yourself before running the suite. Both stay in the foreground, so each needs its own terminal, and the suite then runs in a third:

```bash
# terminal 1
yarn es snapshot --license trial -E transport.port=9400   # Elasticsearch on localhost:9200

# terminal 2
yarn start                         # Kibana on localhost:5601
```

`start` will not launch them for you. It brings up a separate Scout cluster on `9220` and `5620` for the suite to run against, and leaves your development instance alone. Omitting `--profile` prompts for a destination instead.

Either way the profile also supplies this suite's `GCS_CREDENTIALS`, read from `gcsDatasetAccessCredentials` in the profile's config — from Vault for `dev-vault`, from `config.<profile>.json` otherwise, and `node scripts/evals init` can fill it in. Export the variable by hand only when running outside a profile, as [publishing](#publishing-the-synthetic-snapshot) does.

For model and judge selection, `--grep` and repetitions, see [running evals locally](../../../../platform/packages/shared/kbn-evals/README.md#11-getting-started-locally). In CI, Customer-0's judge is pinned to `eis-openai-gpt-6-sol`, the model the online evals judges use; a `models:judge:` label doesn't change it. A run filtered with `EVAL_GREP` drops the shards, so pass `EVAL_CONNECTOR_ID=eis-openai-gpt-6-sol` with it. Pass it locally with `--judge`. The suite overrides no other flags.

## Trace-only investigations

This selection runs code in the shared sandbox-api on GCP. Its credentials are already in the dev
Vault, so run with `--profile dev-vault` and there is nothing to configure:

```bash
# Every eval (smoke + trace-only); prefix NIGHTSHIFT_DATASETS=trace-only to run only this one
node scripts/evals start \
  --suite nightshift-investigations --profile dev-vault \
  --model eis-anthropic-claude-5-5-sonnet \
  --judge eis-openai-gpt-6-sol
```

The suite owns its sandbox wiring through the `scoutHook` in its
[`evals.suites.json`](../../../../../.buildkite/pipelines/evals/evals.suites.json) entry,
[`scout/scout_hook.sh`](scout/scout_hook.sh). The hook reads the `sandbox` block and exports the
`SANDBOX_*` variables plus `SANDBOX_KIBANA_CONFIG`, which tells the `evals_nightshift_investigations`
Scout config set to load [`scout/kibana.sandbox.yml`](scout/kibana.sandbox.yml). Kibana resolves the
`${SANDBOX_*}` references in that file from its environment, so API keys never reach disk or
process arguments. The hook needs `jq`.

The `sandbox` and `nightshift` blocks live in the suite's own Vault secret (`"vaultSecret":
"nightshift"`), separate from the general `@kbn/evals` config that every other suite reads, so
rotating them cannot break other suites:

| Where                 | Hook input                                                       |
| --------------------- | ---------------------------------------------------------------- |
| CI (`run_suite.sh`)   | `kv/ci-shared/kbn-evals/nightshift` in the ci-prod Vault         |
| `--profile dev-vault` | `secret/kibana-issues/dev/kbn-evals/nightshift` in the dev Vault |
| Other profiles        | The profile's `config.<profile>.json` (see below)                |

#### Rotating Nightshift secrets

Retrieve the secret into the gitignored [`vault/config.json`](vault/config.example.json), edit it, and upload it. Upload runs this suite's hook on the file first and refuses a config the hook rejects. Each upload replaces the whole secret, so always retrieve first. See [updating Vault config](../../../../platform/packages/shared/kbn-evals/README.md#ci-ops) for logging in to each Vault.

```bash
# dev Vault (dev-vault profile)
node x-pack/platform/packages/shared/kbn-evals/scripts/vault/retrieve_secrets.js --vault dev --suite nightshift-investigations
node x-pack/platform/packages/shared/kbn-evals/scripts/vault/upload_secrets.js --vault dev --suite nightshift-investigations

# ci-prod Vault (CI)
node x-pack/platform/packages/shared/kbn-evals/scripts/vault/retrieve_secrets.js --vault ci-prod --suite nightshift-investigations
node x-pack/platform/packages/shared/kbn-evals/scripts/vault/upload_secrets.js --vault ci-prod --suite nightshift-investigations
```

#### Other profiles or a different sandbox

A profile backed by a local config file (for example `--profile local`, reading
`scripts/vault/config.local.json` in `@kbn/evals`) needs its own `sandbox` block:

```json
"sandbox": {
  "apiKey": "...",
  "url": "https://sandbox-api.example.com:443"
}
```

Kibana connects to `url` over TLS and authenticates with the API key; without a port, `https`
defaults to 443. A sandbox that requires mTLS also needs
`"ssl": { "certificate", "key", "certificateAuthorities" }` as PEM **file paths** (`certificate` and
`key` together; inline PEM contents are ignored).

Alternatively, export the variables yourself, for example to point at a sandbox you run locally:
`SANDBOX_API_KEY`, and `SANDBOX_API_URL` or `SANDBOX_API_HOST` / `SANDBOX_API_PORT` (default
`localhost:9090`; the probe port is not the gRPC endpoint), plus `SANDBOX_CLIENT_CERT_PATH` /
`SANDBOX_CLIENT_KEY_PATH` / `SANDBOX_CA_CERT_PATH` for mTLS. Profile values, including the
profile's address in either form, take precedence over exported ones. The hook fails early if a
PEM file is not readable. A self-hosted sandbox must allow sandbox-api
to reach its containers; leave sandbox-service's `WORKSPACE_SNAPSHOT_*` settings unset for isolated
conversations.

Set `SANDBOX_MAX_CONCURRENT_SESSIONS` on a self-hosted sandbox-api process to support the run
(for example, 64 for a 61-example, concurrency-16 run). Its default pool holds only ten active
sessions; Kibana Task Manager capacity does not resize it. Restart sandbox-api after active runs
finish and verify concurrent commands can allocate before launching a larger dataset.

#### What the run does

Investigations only run as the Nightshift agent service account, so the eval first creates the
account's roles on stateful (`ensureNightshiftServiceAccountRoles`), finds or creates the accounts
(`ensureNightshiftServiceAccounts`, as the app's setup step does), and sets up the space with `POST /internal/nightshift/investigations/service_account/_enable` (idempotent; the eval
user holds `manage_security`). The `evals_nightshift_investigations` config set turns on
`xpack.security.serviceAccounts.enabled`. Nightshift allows five manual investigations a day by
default and the eval starts one per example, so it turns the daily investigation limits off with
`PUT /internal/significant_events/run_quotas` (`investigationLimitsEnabled: false`), as an admin
would on the Nightshift settings page. The setting stays on that stack.

The native framework still requires an evaluation endpoint in its configuration; the command
reuses the target endpoint for that metadata. This suite never invokes an LLM evaluator or judge.
The CODE evaluator `ungraded_placeholder` always returns one, uses neutral direction, and states
that no quality evaluation was performed. Execution errors, missing reports, incomplete traces, missing
examples or missing persisted scores fail independent acceptance checks even if that score is one.
Recovered tool errors remain visible in the evidence. Trace acceptance checks their complete
payloads, including model calls rejected by schema validation before tool execution.
The bundled synthetic cases also require a successful sandbox command (exit code zero), so an
unavailable sandbox cannot pass acceptance. The calculation output and investigation answer stay
ungraded; this fixture-specific execution check does not apply to custom files or stored datasets.

The default [synthetic file](evals/investigation/synthetic.json) contains two public fictional
incidents. Their questions contain all evidence and request a sandbox calculation, so no telemetry
connector, Elasticsearch identity, customer dataset, reference answer or snapshot is required.
The selected model runs the product manual-investigation route; the runner polls the shared
investigations API (`GET /internal/investigations/investigations/{id}`) until no agent works on the
investigation, and reads what it recorded (summary, verdict, severity, hypotheses, impact, proposed
actions) and its conversation. Scores store the report, execution status, conversation
round count, and investigation/conversation/trace identifiers. Conversation rounds and tool payloads
stay in the product conversation and full agent traces rather than being duplicated in each score,
whose ingestion request has a 5 MiB limit. Acceptance fetches the saved conversation separately and
checks every round against the exported trace. Each score links the agent's conversation trace;
the placeholder has a separate evaluator trace.

Reports above 512 KiB are represented in the score by their summary, conclusion and severity,
with `report_truncated: true`; summary and conclusion are limited to 10,000 characters in that
fallback. Full report evidence remains available through the investigation and agent trace.
Independently, error text above 10,000 characters keeps that prefix plus a truncation marker and
remains an execution failure. Ordinary reports are preserved unchanged.

The `evals_nightshift_investigations` server config extends `evals_tracing` whenever the hook
exports sandbox credentials. Otherwise it is plain `evals_tracing`, so the smoke eval needs no
sandbox credentials. It enables the investigation engine, its `nightshift.enabled` feature flag
and sandbox, pauses online evals (`nightshift.onlineEvals.paused`) so investigations are judged
only by the suite, disables Wiki and Semantic Memory unless [knowledge switches](#knowledge-switches)
turn them on, and exports full Agent Builder payloads (user messages, system
instructions, responses, tool arguments/results and conversation IDs) to the profile's configured
destination. Trace-exporter headers and connector credentials reach Kibana through
environment references in committed YAML, without generated secret files or credential arguments.
Full payloads have the destination's access controls; use synthetic questions or data
you are allowed to export there. Existing sandbox connector authorization remains unchanged.

To run another file with the same loader and task:

```bash
NIGHTSHIFT_DATASETS=trace-only NIGHTSHIFT_EXAMPLES_FILE=/absolute/path/examples.json \
  node scripts/evals run --suite nightshift-investigations --profile dev-vault \
  --model eis-anthropic-claude-5-5-sonnet --judge eis-openai-gpt-6-sol
```

```json
{
  "dataset": "nightshift/my-traces",
  "examples": [
    {
      "input": {
        "question": "Investigate this fictional incident using the evidence supplied here..."
      },
      "metadata": { "case_id": "synthetic-incident-1" }
    }
  ]
}
```

The file must contain 1–1,000 examples with distinct nonempty `metadata.case_id` values and
nonempty questions within the product's 10,000-character limit. Dataset names must start with
`nightshift/`; the native executor upserts this owned dataset. Optional `output` labels, additional
input/metadata fields, file `description` and `tags` are preserved. Questions alone reach the
investigator; labels and metadata do not. `NIGHTSHIFT_EXAMPLES_FILE` defaults to the committed
synthetic fixture. No golden-source derivation or LangSmith identifier is needed.
Tags must satisfy the shared dataset API schema, including its 64-character limit and 20-tag
total after adding the required `nightshift` and `ungraded` tags.

Acceptance verifies expected example/repetition coverage, one persisted placeholder per run,
completed investigations, saved report/conversation identifiers, complete linked agent traces,
and no LLM calls in the evaluator traces. The terminal prints experiment, dataset, case,
investigation, conversation and trace IDs for sharing. Inspect them in the evaluations UI under
`/app/management/ai/evals/experiments/<experiment-id>`; per-example links add
`?dataset_id=<dataset-id>&example_id=<example-index>&trace_id=<agent-trace-id>`.
Historical full-grader runs are not acceptance evidence for this runner. Graders, native trace
metrics, automatic provisioning and generalized CI defaults are deferred.

`evals start` restarts Scout automatically when connectors, the server config set,
`TRACING_EXPORTERS`, `GCS_CREDENTIALS` or any variable the hook exports changes. Switching
`NIGHTSHIFT_DATASETS` needs no restart: whenever sandbox credentials are present, Scout starts with
the investigation engine and sandbox, and the smoke eval runs on that server too.

Use `evals run` to repeat a run with unchanged startup settings. Without sandbox credentials (for
example a profile that has no `sandbox` block), an unset `NIGHTSHIFT_DATASETS` runs only the smoke
eval and prints a warning.

## Stored investigation datasets and concurrency

Select an existing evaluations dataset by its exact name in the evaluations UI:

```bash
NIGHTSHIFT_DATASET_NAME='<dataset-name>' \
  node scripts/evals start --suite nightshift-investigations --profile dev-vault --repetitions 1 \
  --model eis-anthropic-claude-5-5-sonnet \
  --judge eis-openai-gpt-6-sol
```

`NIGHTSHIFT_DATASET_NAME` selects trace-only investigations when `NIGHTSHIFT_DATASETS` is unset.
It reads the dataset from the results profile's Kibana, in the first `--space-ids` Space (default: `default`). It preserves the original dataset
and example IDs, labels, tags and metadata through `trustUpstreamDataset`. The existing runner
upserts the fetched dataset before running; skipping that write is a separate framework follow-up. Its examples
must satisfy the same question and distinct `case_id` requirements as a file. Do not combine it
with `NIGHTSHIFT_EXAMPLES_FILE`. The dataset's data source still needs the sandbox credentials and
a [connector set](#connector-sets); selecting a dataset does not provision its source data.

The investigation spec sets the existing `runExperiment` concurrency option to **16**. Its
Scout config reserves **21 normal-task slots** (42 raw cost units): sixteen for investigation
workflows and five for background work. The workflow executes its agent inline, without a second
Task Manager task. The spec uses the same concurrency constant for trace checks and for calculating
the timeout from example/repetition batches and the 20-minute investigation deadline, with two
additional minutes per batch for trace ingestion.

To change parallelism, edit the spec's concurrency constant and ensure the Scout config and
sandbox pool have sufficient capacity. Restart Scout after changing its capacity. Dataset
selection alone does not restart Scout. `run` and `start --skip-server` use your existing stack,
whose Task Manager capacity you must configure yourself. Wait for any active eval to finish before
restarting a shared local stack.

## Connector sets

Evals start the investigator the way production does: with a set of saved connectors, listed for
the agent in `connectors.md`. There is no eval-only telemetry setting, start parameter or index
hint; the agent finds the data through the connectors, as it must for a customer. A connector set
is the group of preconfigured connectors one Scout stack starts with:

| Set         | Kibana config                                                          | Connectors                                     | Credentials (Vault / profile JSON)         |
| ----------- | ---------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------ |
| `default`   | [`scout/connector_sets/default.yml`](scout/connector_sets/default.yml) | `elasticsearch` (`.elasticsearch`)             | `nightshift.telemetry.{url,apiKey}`        |
| `orcabench` | none                                                                   | `orcabench-es` (`.elasticsearch`), by the eval | `nightshiftOrcaEs.{url,username,password}` |

To add a connector to a set, declare it in the set's YAML and add its id to `CONNECTOR_SETS`. The
hook selects `orcabench` on the ORCA shard (or `NIGHTSHIFT_DATASETS=orcabench`), and `default`
whenever Elasticsearch credentials are configured. It exports `NIGHTSHIFT_CONNECTOR_SET` and points the
Scout config set at the set's YAML; the eval then saves every connector in the set on the
investigator through the Agent Builder agents API (`saveConnectorSetOnInvestigator` in
[`connector_sets.ts`](evals/investigation/connector_sets.ts)), as a user would in the agent's
settings. Without a connector set, nothing is saved. One stack runs one set; the eval does not
switch connectors per example. `orcabench` preconfigures nothing: the eval creates its one
connector and puts each cutoff's key on it in turn (see [telemetry cutoff](#telemetry-cutoff)).

The `default` set's credentials keep the Vault field name `nightshift.telemetry`:

```json
"nightshift": {
  "telemetry": { "url": "https://es.example.com", "apiKey": "..." }
}
```

`url` and `apiKey` are required together, and a connector set requires sandbox credentials.
Profile values take precedence over these shell fallbacks, which replace the former
`NIGHTSHIFT_SANDBOX_ELASTICSEARCH_URL` and `NIGHTSHIFT_SANDBOX_ELASTICSEARCH_API_KEY`:

| Variable                | Purpose                                                                           |
| ----------------------- | --------------------------------------------------------------------------------- |
| `NIGHTSHIFT_ES_URL`     | Elasticsearch endpoint, without embedded credentials. Requires the API key below. |
| `NIGHTSHIFT_ES_API_KEY` | Encoded restricted API key, without the `ApiKey` prefix. Requires the URL above.  |

A `readableIndices` field left in Vault is ignored.

Restrict each Elasticsearch API key to `read` and `view_index_metadata` on the patterns the
examples need, with only the cluster privileges required for discovery. Keep endpoints and keys in
Vault (or a private local profile JSON), and customer example files private and uncommitted. The
existing credential resolver authorizes connector access and execution, checks the agent's
allow-list, and exposes the API key only to the requesting sandbox command.
`/workspace/.connector-docs/elastic.md` is the same Elasticsearch guide every investigation gets.

```bash
NIGHTSHIFT_DATASETS=trace-only NIGHTSHIFT_EXAMPLES_FILE=/private/path/examples.json \
  node scripts/evals start --suite nightshift-investigations --profile dev-vault \
  --model eis-anthropic-claude-5-5-sonnet --judge eis-openai-gpt-6-sol
```

For connectivity acceptance, inspect the persisted agent trace's command and actual Elasticsearch
response: confirm it queried the intended connector and returned data from the intended
remote/index and time range without query or remote failures. A `connector_id`, exit code zero,
completed investigation or placeholder score alone does not prove connectivity.

Leave the Elasticsearch settings unset for the bundled synthetic examples; they need no connector. The
former `remote` selection and `NIGHTSHIFT_REMOTE_EXAMPLES_FILE` are replaced by this shared file
workflow.

## Knowledge switches

Investigations run without learned knowledge by default. `NIGHTSHIFT_KNOWLEDGE` turns on any of
`memory`, `wiki` and `decision-trees` (comma-separated), and the eval then copies that system's
knowledge from the endpoint under test into the run's space before the first example:

```bash
NIGHTSHIFT_KNOWLEDGE=memory,decision-trees NIGHTSHIFT_DATASETS=trace-only \
  NIGHTSHIFT_EXAMPLES_FILE=/private/path/examples.json \
  node scripts/evals start --suite nightshift-investigations --profile dev-vault --repetitions 1 \
  --model eis-anthropic-claude-5-5-sonnet --judge eis-anthropic-claude-4-6-sonnet
```

- The knowledge comes from the endpoint the [connector set](#connector-sets) investigates:
  `nightshiftKnowledge.default` for customer0 and `nightshiftKnowledge.orcabench` for ORCA, each
  with the `url` and `apiKey` of the Elasticsearch cluster behind that endpoint's Kibana, and the
  `spaceId` that holds its knowledge (default `default`). For the default set only, without a
  profile block, the hook reads `NIGHTSHIFT_KNOWLEDGE_ES_URL`, `NIGHTSHIFT_KNOWLEDGE_ES_API_KEY`
  and `NIGHTSHIFT_KNOWLEDGE_SPACE_ID` from the shell; an ORCA run needs its own block, so stale
  customer0 values in the shell can't load customer0 knowledge into it. See
  [Knowledge source key](#knowledge-source-key).
- Before the first example, the eval clears all three knowledge indices in its space, then copies
  every selected system's documents from the source space, moving their ids and `space_id` into its
  own space. Embeddings are recomputed by the eval cluster on write. A source space with no
  documents for a selected system fails the run.
- The Scout config set turns on each selected system and turns learning off
  (`xpack.nightshift_investigations.learning.enabled=false`), so the post-run optimize hook doesn't
  change the knowledge while examples run. Decision trees need the Wiki runtime, so
  `decision-trees` alone also runs Wiki, with an empty Wiki index.
- Every score records `knowledge` (the selection, or `none`), `knowledge_source`, and per system the
  number of documents loaded and the newest one's `@timestamp`.
- Changing `NIGHTSHIFT_KNOWLEDGE` restarts Scout, since it changes the server's flags.

### Knowledge source key

The knowledge indices live on the Elasticsearch cluster behind the endpoint's deployed Kibana, and
the connector keys don't grant access to them, so the copy needs its own key. The `dev-vault` profile
has no `nightshiftKnowledge` block yet, so for now each developer mints a short-lived read-only key
with credentials for that cluster (any user with `manage_own_api_key`):

```bash
curl -s -u "$ES_USER:$ES_PASSWORD" -H 'Content-Type: application/json' \
  -X POST "$KNOWLEDGE_ES_URL/_security/api_key" -d '{
    "name": "nightshift-evals-knowledge-read-<you>",
    "expiration": "7d",
    "role_descriptors": { "knowledge_read": { "indices": [
      { "names": ["ai-index-idx-nightshift-*"], "privileges": ["read"] }
    ] } }
  }'
```

Use the response's `encoded` value as the key, and keep it out of the repo, for example in a
`chmod 600` file loaded before the run:

```bash
# ~/.nightshift-knowledge-c0.env
NIGHTSHIFT_KNOWLEDGE_ES_URL=https://<cluster>.es.<region>.elastic.cloud
NIGHTSHIFT_KNOWLEDGE_ES_API_KEY=<encoded>
NIGHTSHIFT_KNOWLEDGE_SPACE_ID=default
```

```bash
set -a; source ~/.nightshift-knowledge-c0.env; set +a
NIGHTSHIFT_KNOWLEDGE=memory,wiki node scripts/evals start --suite nightshift-investigations ...
```

The URL must not embed credentials, and the hook fails the run before Scout starts when the key or
URL is missing. A key past its expiration fails the copy with a 401; mint a new one. CI and the
`orcabench` connector set need the key in the profile's `nightshiftKnowledge.<set>` block instead.

Known limitation: the copy is the source space's knowledge as it is at run time. It is not
filtered against the cases under test, so it can hold knowledge that an earlier investigation of
the same case derived, which can give away the reference cause. Read knowledge-on scores with that
in mind until the copy excludes each case's own investigations.

## Connector probes

`NIGHTSHIFT_DATASETS=connector-probe` asks the hidden **Nightshift Assistant** agent
(`nightshift.assistant`) each question in one `POST /api/agent_builder/converse` call. The
assistant has the investigator's tools, connectors, Wiki and Semantic Memory hooks, but a short
direct-answer prompt that reads the workspace `.md` files only when needed, and no decision trees,
so a probe takes a few model turns instead of a full investigation. Use it to iterate quickly on
how the agent queries Elasticsearch. Wiki and memory optimize still run after each reply, so
probes update the space's wiki and memories like investigations do.

It is opt-in: unset and `all` never select it, because it needs a
[connector set](#connector-sets) as well as sandbox credentials. The probe saves the set on the
investigator too, since the assistant uses the investigator's connectors.

```bash
NIGHTSHIFT_DATASETS=connector-probe NIGHTSHIFT_PROBE_EXAMPLES_FILE=/path/to/probes.json \
  node scripts/evals start --suite nightshift-investigations --profile dev-vault --repetitions 1 \
  --model eis-anthropic-claude-5-5-sonnet --judge eis-openai-gpt-6-sol
```

Probes are not bundled: they name a real cluster's remotes and data streams, so they live outside
the repository. `NIGHTSHIFT_PROBE_EXAMPLES_FILE` points at a file in the
[same format](#trace-only-investigations) as trace-only investigations, where each example's
`output.reference_answer` describes the expected behaviour. Write questions with a relative time
window and references that grade behaviour rather than counts, so they stay valid week to week. Give
a subset its own `dataset` name so it does not replace the stored full set.

| Evaluator             | Kind | Scores                                                                     |
| --------------------- | ---- | -------------------------------------------------------------------------- |
| `connector_used`      | CODE | At least one `nightshift_sandbox_bash` call passed a `connector_id`.       |
| `within_time_budget`  | CODE | The `converse` call finished within `NIGHTSHIFT_PROBE_TIME_BUDGET_S` (30). |
| `reference_behaviour` | LLM  | The reply and tool calls match the example's `output.reference_answer`.    |

Set `SELECTED_EVALUATORS=connector_used,within_time_budget` to skip the judge. Each run logs its
case, duration, tool-call count, conversation and trace ids and scores. A failed `converse` call
fails the test; low scores do not.

## Wiki optimizer replay

`NIGHTSHIFT_DATASETS=wiki-optimize` replays saved investigation rounds through the real Wiki
optimizer with a real model and scores the wiki pages it writes. No investigation runs and no
sandbox is needed, so a run takes a few model calls per example and isolates what the optimizer
learns from a round: recurring tool failures and a correction in a follow-up message. The
optimizer's own page store runs unchanged on an in-memory Elasticsearch fake, so page ids, statuses, corroboration counts and provenance behave as in production.

It is opt-in: unset and `all` never select it. It still needs a model endpoint, so start it the same
way as the other evals:

```bash
NIGHTSHIFT_DATASETS=wiki-optimize \
  node scripts/evals start --suite nightshift-investigations --profile dev-vault --repetitions 3 \
  --model eis-anthropic-claude-5-5-sonnet --judge eis-anthropic-claude-4-6-sonnet
```

The model is not deterministic, so use several repetitions and read the per-evaluator pass rates.
The bundled `evals/wiki_optimize/synthetic.json` uses made-up services. Replays built from real
traces name real infrastructure, so they live outside the repository: point
`NIGHTSHIFT_WIKI_REPLAY_FILE` at a file in the same format.

Each example replays one or more `rounds` against one store, optionally starting from `seed_pages`:

| Round `kind`     | What the optimizer is told                                                                        |
| ---------------- | ------------------------------------------------------------------------------------------------- |
| `initial`        | An investigation: learn the durable structure and tool behaviour it established.                  |
| `follow_up`      | A user turn after an answer (`previous_assistant_message`) that may correct or extend it.         |

An example's `output` states what must happen. Terms in `must_capture` may list alternatives with
`|`.

| Evaluator             | Kind | Scores                                                                                         |
| --------------------- | ---- | ---------------------------------------------------------------------------------------------- |
| `capture_recall`      | CODE | The share of `must_capture` items found on a page of the right type and section.               |
| `non_temporal`        | CODE | The share of written pages free of dates, ids and counts of one run.                           |
| `must_not_absent`     | CODE | No page holds a case-specific detail listed in `must_not`.                                     |
| `effects_met`         | CODE | Each round created, corroborated, rewrote, archived or left untouched the pages `effects` name. |
| `page_bounds`         | CODE | No more pages written than `max_pages_written`, and no near-duplicates of a described page.    |
| `new_pages_tentative` | CODE | A page created in a round starts tentative.                                                    |

An evaluator that does not apply to an example scores `null` rather than 1, so pass rates are not
diluted.

## Deferred sandbox session isolation

The shared sandbox workspace is scoped to a space and conversation, not to an agent's connector
allow-list or a user's current execution privileges. Connector guides are written for every
conversation, but overlapping calls with different
authorization contexts can race between manifest preparation and file access. Previously created
files can also remain in that workspace. This PR does not establish isolation between those contexts.

A separate follow-up must define the workspace ownership boundary and cover manifest updates,
tool execution, retained files, permission changes, and reuse across Kibana restarts or instances.
Serializing manifest writes alone does not close the gap before a subsequent tool operation.
Until then, use a conversation only within one trusted authorization context. The outstanding
[review finding](https://github.com/elastic/kibana/pull/291603#discussion_r4097938707) records this
explicitly deferred scope.

## Two kinds of dataset

The word "dataset" means two different things in evals, and this suite keeps them apart deliberately. It is worth reading once.

| Term             | What it is                                                                                                                                  | Where it lives                    |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| **Eval dataset** | The examples a run is scored on: an input, the expected output, and metadata. Scores are recorded against it.                               | [`src/datasets/`](src/datasets)   |
| **Seed data**    | The Elasticsearch documents an eval dataset is evaluated _against_ — logs, metrics, traces, alerts. Restored into the cluster before a run. | [`src/seed_data/`](src/seed_data) |

An eval dataset names its seed data through `seedSource`, but the two are otherwise independent: several eval datasets can sit on top of the same seed data, and swapping the target under test changes neither. That is what lets one eval dataset and its evaluators be reused against a different target.

## Layout

One eval is one folder under `evals/`, holding everything specific to it. `src/` holds only what
every eval shares.

| Path              | Holds                                                                    |
| ----------------- | ------------------------------------------------------------------------ |
| `evals/<name>/`   | One eval: its datasets, task, evaluators, types and spec                 |
| `src/datasets/`   | The eval dataset contract, selection, and conversion to framework shape  |
| `src/seed_data/`  | Seed sources, plus seeding, publishing and clearing them                 |
| `src/evaluate.ts` | The suite's Playwright fixture                                           |
| `scripts/lib/`    | Code shared between the CLIs, such as connecting to a cluster from flags |
| `scripts/<name>/` | One developer CLI each, run via a launcher in Kibana's root `scripts/`   |

Inside an eval folder the files always mean the same thing, so `evals/smoke/` reads as a template:

| File            | Holds                                                              |
| --------------- | ------------------------------------------------------------------ |
| `types.ts`      | The example shape, its expected output, and the evaluator type     |
| `datasets.ts`   | The eval datasets and a `get<Name>Datasets()` that applies filters |
| `task.ts`       | What runs under test, and the shape of its output                  |
| `evaluators.ts` | The evaluators, and the array the spec passes to the runner        |
| `*.spec.ts`     | Wiring: iterate datasets, seed, run, score                         |

Playwright only collects `*.spec.ts`, so the neighbouring files are invisible to it while Jest
still picks up `*.test.ts`.

Specs stay thin because [`withSeedData`](src/seed_data/with_seed_data.ts) registers both the `beforeAll` that seeds and the `afterAll` that clears, so no spec carries its own copy and none can forget cleanup:

```ts
evaluate.describe(dataset.id, () => {
  const seedData = withSeedData(dataset);

  evaluate('...', async ({ esClient }) => {
    // seedData().indices — the data streams seeding actually wrote
  });
});
```

## Adding a new eval

For seeded evals, follow [`evals/smoke/`](evals/smoke). For file-driven investigations, follow
[`evals/investigation/`](evals/investigation). Which folders run is decided by
[`resolveEvalSelection`](src/datasets/eval_selection.ts) and applied as `testIgnore` in
`playwright.config.ts`; a new seeded eval is covered by adding its datasets to `selectDatasets`.

1. **`types.ts`** — describe an example: its input, the expected output your evaluators will read,
   and an evaluator type bound to your task's output.
2. **`task.ts`** — call the thing under test and return a typed result. For the investigation
   engine that means `POST /internal/nightshift/investigations` through the `fetch` fixture, passing
   the eval model as `connector_id`, then polling the shared investigations API until the
   investigation is no longer in progress.
3. **`datasets.ts`** — declare `Dataset` objects with an `id`, a `name` that scores are recorded
   against, a `seedSource`, and an `examples()` call returning ground truth. Export a
   `get<Name>Datasets()` that passes them through `selectDatasets`, which is what makes
   `NIGHTSHIFT_DATASETS` work for your eval too.
4. **`evaluators.ts`** — write CODE evaluators as plain objects, and reach for the `evaluators`
   fixture for LLM-as-judge scoring (`evaluators.criteria([...])`). Export them as one array.
5. **`<name>.spec.ts`** — iterate your datasets, call `withSeedData(dataset)` once per describe
   block, and hand the task and evaluators to `executorClient.runExperiment`.

Two details worth knowing before you start:

- **Seed data belongs in [`src/seed_data/sources.ts`](src/seed_data/sources.ts), not in your eval
  folder.** Several evals can share one snapshot, and the CLI that publishes it has to agree with
  the eval that reads it, so each source is declared once and referenced by both.
- **`examples` is a function, not an array.** It is called when Playwright collects the describe
  tree, which is what a dataset reading ground truth from files downloaded during global setup
  needs.

If your eval needs data from somewhere other than a GCS snapshot, add a member to `SeedSource` in
[`src/seed_data/types.ts`](src/seed_data/types.ts) and a branch to `seedDataset` in
[`src/seed_data/seed.ts`](src/seed_data/seed.ts). That switch is the only place seeding fans out.

## Seed data

Seed data comes from snapshots in the `nightshift-datasets` GCS bucket, laid out engine-first so a
suite can scope to a whole engine or narrow to one source:

```
nightshift-datasets/
└── investigation-engine/
    ├── synthetic/            # the smoke eval's snapshot and any other synthetic datasets
    └── customer0/            # labelled incidents
```

`detection-engine/` is reserved at the same level for later capabilities. Elasticsearch reads the
bucket through its own keystore rather than the eval process, which is why the credential has to
be present before the cluster starts; the `evals_tracing` Scout config (the default for eval
suites) handles the wiring.

### Publishing the synthetic snapshot

The smoke eval restores `synthetic-smoke` from `investigation-engine/synthetic`. To create or
refresh it:

```bash
export GCS_CREDENTIALS="$(cat service-account.json)"
node scripts/scout start-server --serverConfigSet evals_tracing
node scripts/publish_nightshift_eval_snapshot.js
```

The script seeds throwaway documents into a data stream, snapshots them to GCS and removes the
local copy. See `--help` for its flags.

Publishing refuses to overwrite a snapshot that already exists, since a snapshot is found by name
and the data it would replace is gone for good. Add `--replace` to refresh one deliberately:

```bash
node scripts/publish_nightshift_eval_snapshot.js --replace
```

Only the document generation in that script is specific to the synthetic dataset. Publishing goes
through [`publishEsSnapshot`](src/seed_data/publish_es_snapshot.ts), which takes an eval dataset's
own `seedSource` and so writes to exactly the location
[`replayEsSnapshot`](src/seed_data/es_snapshot.ts) will read from — the write side cannot drift
away from the read side. A CLI that captures real data should reuse it, along with
[`createEsClient`](scripts/lib/es_client.ts) for reaching a remote cluster:

```ts
await publishEsSnapshot({
  source: myDataset.seedSource,
  indices: ['logs-*', 'metrics-*', 'traces-*'],
  esClient,
  log,
});
```

This needs a service account with **write** access; the credential CI restores with is read-only.
Raising `--document-count` also means raising `SYNTHETIC_SMOKE_DOCUMENT_COUNT` in
[`sources.ts`](src/seed_data/sources.ts), since that constant is the ground truth the eval scores
against.

## Environment variables

| Variable                         | Effect                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NIGHTSHIFT_DATASETS`            | Comma-separated dataset ids (whitespace trimmed). Smoke dataset ids such as `synthetic-smoke` select seeded evals; `trace-only` selects the file-driven investigations; they can be combined, e.g. `synthetic-smoke,trace-only`. Unset or `all` runs every eval when sandbox credentials are present, except that a stored `NIGHTSHIFT_DATASET_NAME` defaults to trace-only when selection is unset. Without them, unset runs only smoke with a warning, while an explicit `all` or `trace-only` fails before any test runs, even when Scout is reused. `connector-probe` selects the [connector probes](#connector-probes), which unset and `all` never include. `wiki-optimize` selects the [Wiki optimizer replay](#wiki-optimizer-replay), which unset and `all` never include and which needs no sandbox credentials. `orcabench` selects the isolated ORCA dataset and cannot be combined with other ids; it requires an ORCA-configured Scout server. Unknown ids fail early. |
| `NIGHTSHIFT_KNOWLEDGE`           | Comma-separated knowledge systems (`memory`, `wiki`, `decision-trees`) to turn on and restore before the first example. Unset turns them all off. See [knowledge switches](#knowledge-switches).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `NIGHTSHIFT_PROBE_EXAMPLES_FILE` | Examples file for `connector-probe`; required when it is selected. See [connector probes](#connector-probes).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `NIGHTSHIFT_WIKI_REPLAY_FILE` | Replay file for `wiki-optimize`; the bundled synthetic examples when unset. Same `nightshift/` dataset-file format as the investigation examples, with the round and expectation fields in [Wiki optimizer replay](#wiki-optimizer-replay). |
| `NIGHTSHIFT_PROBE_TIME_BUDGET_S` | Seconds a probe may take before `within_time_budget` scores 0 (default 30).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `SELECTED_EVALUATORS`            | Standard `@kbn/evals` filter, by evaluator name (`documents_restored`, `timestamps_replayed`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `GCS_CREDENTIALS`                | Service account JSON Elasticsearch uses to reach the seed-data bucket. Read access is enough to run the suite.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

Because every eval dataset gets its own `describe` block, Playwright's `--grep` filters by dataset id as well.

```bash
NIGHTSHIFT_DATASETS=synthetic-smoke node scripts/evals run --suite nightshift-investigations
```

## ORCA benchmark

`orcabench` runs ORCA's 50 sampled tasks from the Golden dataset `nightshift/orca-sampled50-v4`
against the ORCA telemetry cluster: 40 incident tasks over 28 incidents and 10 no-incident
controls. Each question uses ORCA's own wording: a stated current time, a vague or offset report
time and the user-facing symptom, without the incident onset or an analysis window. CI runs it as
its own shard under the `evals:nightshift-investigations` label, next to the `customer0` shard that
runs the smoke and trace-only evals, so each Scout server runs one [connector set](#connector-sets).
The ORCA shard runs the `orcabench` set: the investigator has one Elasticsearch connector, named
`orcabench_es`. The question names that connector, as ORCA's names its Grafana API, but no
index, so the agent discovers the ORCA indices the way it would on any cluster. The space carries
one custom context snippet (`ORCA_CUSTOM_CONTEXT` in
[`custom_context.ts`](evals/investigation/custom_context.ts)) pointing at the demo's public source,
`github.com/open-telemetry/opentelemetry-demo` at commit `fc77a6cbc0bf36ff52f21e4d59fa7b8a0f5d6733`,
the commit the paper's environment is built on. The paper's agents find that checkout at
`/app/opentelemetry-demo`; ours clone it in the sandbox, as the customer0 space points at Elastic's
repositories. The sandbox's egress proxy refuses any host the space has not allowed, so whenever the
custom context names GitHub the eval adds `github.com`, `codeload.github.com`,
`objects.githubusercontent.com` and `raw.githubusercontent.com` to the space's sandbox allowlist
(`PUT /internal/nightshift/sandbox_allowlist`, [`sandbox_allowlist.ts`](evals/investigation/sandbox_allowlist.ts));
without them every clone fails with `CONNECT tunnel failed, response 403`. The Golden release `nightshift/orca-ech-full-20261019` is an alert-triggered eval
of 42 questions and is not this ORCA benchmark; CI does not run it. Quote that 42-question set
as a benchmark result again only after its windows end at detection time.

Each example records `metadata.current_time` and `metadata.telemetry_snapshot_time`. ORCA serves
each task the first telemetry snapshot taken after `current_time` plus five minutes, or its last
snapshot when none is later, so that snapshot time is the latest data the paper's agents can see.
Public tasks also carry ORCA's ground truth, the task's `tests/expected.json`, as
`metadata.orca_expected`: each plausible event's `event_id`, `root_cause` and `event_time`, or a
control's quiet window. Every read here stops there too; see [telemetry cutoff](#telemetry-cutoff).

### Telemetry cutoff

The ORCA cluster holds all six days, so Elasticsearch, not the investigation, bounds what a task can
read. The agent investigates unchanged and no query it writes can see past its task's cutoff.

- **Cutoff.** A task's cutoff is its `telemetry_snapshot_time`; a release without one on every task
  fails before any investigation. The bound is inclusive, `@timestamp <= cutoff`, and
  is always written with milliseconds: Elasticsearch rounds a `lte` date without them up to the end
  of that second. The 755 has 125 distinct cutoffs, the sampled 50 has 41.
- **Keys.** The eval signs in to the ORCA cluster as the user `nightshift-orcabench-eval`, whose
  role reads the three ORCA index patterns and holds `manage_own_api_key`. Elasticsearch only lets a
  user, not an API key, create a key that carries privileges. At run start the eval mints one key
  per cutoff in the run, with `read` and `view_index_metadata` on those patterns and the
  document-level security query `{"range": {"@timestamp": {"lte": "<cutoff>"}}}`. A key expires
  when the test's own timeout would, so it outlives every investigation that reads with it, and is
  invalidated as soon as the experiment ends. A key can read its own record, so the agent could see
  its name, metadata and role. The name is `nightshift-orcabench-eval-<hash>`, a hash of the cutoff
  and the variant, and the metadata holds only the purpose and a run id. The role's query still shows the
  cutoff and, for `no-flags`, the demo's flag keys, but neither is new to the agent: it can find
  the cutoff with a `max` on `@timestamp`, and the flag keys are in the demo source it is pointed
  at (`src/flagd/demo.flagd.json`). No key is logged, stored in a start input
  or written to experiment metadata; each lives only in the connector's secrets while its cutoff
  runs, and the eval writes the connector without letting `kbnClient` log a failed response.
- **One cutoff at a time.** Nightshift runs only in the default space, and connectors are saved on
  its one investigator as a whole, so the eval runs one cutoff's tasks at a time
  ([`orca_cutoff_gate.ts`](evals/investigation/orca_cutoff_gate.ts)). Before a cutoff's tasks start,
  the `orcabench-es` connector gets that cutoff's key; up to eight of them run together, and the
  next cutoff waits until all have ended. An investigation that outlives its poll gets two more
  minutes to end; if it hasn't ended, or can't be found, the run stops before any other key goes
  on, so no key is swapped under a running investigation. Cutoffs
  take turns in dataset order, and the test's timeout counts one batch per cutoff. A run is
  therefore close to serial: the sampled 50 has 41 cutoffs. Run one ORCA eval on a stack at a time,
  since both would write the one connector.
- **Preflight.** Before any investigation, a reference key bounded at ORCA's last snapshot must
  return the document counts pinned in [`orca_dataset.ts`](evals/investigation/orca_dataset.ts) for
  the run's variant. Then every cutoff key must count no document after its cutoff and some document
  up to it, on each signal, and a `no-flags` key no flag document.
- **Records.** Every ORCA experiment records `telemetry_cutoff: dls`, its `telemetry_variant` and
  `telemetry_cutoffs`, so bounded runs never mix with the earlier unbounded runs.

The ORCA cluster's admin creates the eval user and its role once:

```json
PUT /_security/role/nightshift-orcabench-eval
{
  "cluster": ["manage_own_api_key"],
  "indices": [
    {
      "names": ["logs-orcabench.otel-*", "traces-orcabench.otel-*", "metrics-orcabench.otel-*"],
      "privileges": ["read", "view_index_metadata"]
    }
  ]
}
```

ORCA's judges bind to `eis-openai-gpt-5-4`, not the agent connector; Customer-0's bind to
`eis-openai-gpt-6-sol`. ORCA's model is the paper's judge model, but not its settings: the paper runs
GPT-5.4 at reasoning effort "high", temperature 1, and 128,000 max tokens. Our judges answer
through a forced `score` tool call, so the inference adapter sends reasoning effort "none" to
gpt-5 models, and temperature falls back to the provider default of 1. Until the judges can set
an effort ([#297542](https://github.com/elastic/kibana/pull/297542)), ORCA scores here come from a
judge that does not reason and are not directly comparable to the paper's. `goal_pass` is unchanged: it scores the single best hypothesis and passes at
4/5. ORCA also records three scores. RCA accuracy is 1 when the report names every flag in
`metadata.plausible_flags`. A flag named without its variant still counts, and an extra cause
does not fail accuracy. Hallucination is 1 when the report names at least one cause and none of
them is in that set, and its direction is minimize. An empty incident report scores 0 on both.
Only the control judge uses ORCA's prompt. Accuracy and hallucination use our own extraction
prompt, `OrcaFlagsJudgePrompt`, which lists the flags a report names as a cause, and the set logic
above is applied in code. A flag the report explicitly rules out, calls unrelated, or lists only as a
next check is not named, so mentioning every flag as ruled out cannot satisfy accuracy. They do not use the paper's incident judge prompt (`JUDGE_PROMPT_MULTI_HEADER`
plus its scoring footer).
Control passes an empty report and fails when a report places an incident inside
`metadata.quiet_window`. Its judge prompt is ORCA's `JUDGE_PROMPT_CONTROL` from the Harbor tasks'
`check_prediction.py`, word for word except that it answers through the `score` tool. Like ORCA's
judge reading the agent's report file, it sees the whole report: the answer, the evidence, the
impact summary and the proposed actions. It gets
`current_time` and the quiet window moved ten minutes inward on each defined side, with an
open-ended bound shown as `null`, as ORCA does. Past incidents and timeline lines that only record
when the issue was reported are not false positives. A run that crashed, timed out, or ended without recording anything has
no answer, so all three scores are `unscored` (null) instead of reading it as an empty report,
as ORCA leaves unscored trials out. A run whose last agent round failed or was aborted counts
as crashed even when it recorded a verdict first. A report too large to persist keeps only its
summary and conclusion, so it is unscored too. `execution_success` still counts those runs, so quote it next
to any ORCA rate. A run that ended without a verdict but recorded hypotheses is scored on them.
A control is `metadata.control`, `metadata.task_type === "control"`,
`metadata.no_incident === true`, or `metadata.section === "control"`. Accuracy and hallucination
stay `n/a` on a control, including when its flag set is empty. Golden drops an empty metadata
array on write, so the ten controls keep those markers and do not store `plausible_flags: []`.
`rca_anti_leakage` judges trajectory leakage of incident records and post-resolution writeups. It
does not see prompt leakage, and a feature-flag key in telemetry is a legitimate signal.

`nightshift/orca-sampled50-v4` copies `plausible_flags` from the public Harbor dataset
`orca-bench/orca-bench` (`sha256:2add497ac2f93468dba1b83977c295a784c89031754e6a35520195345ad62ada`).
A task matches when `sha256(case_id)` truncated to 16 hex characters is that task's package name
and the task's `user_facing_issue` appears in the question. The copied value is the set of
`events[].root_cause` keys, with duplicate events of the same key removed. The 32 non-medium
incident tasks match and are in the paper's Verified view (the non-medium rows of the sampled
tasks that the ORCA build keeps on the public side: 32 incidents and 8 controls). Those 8
controls, and the 2 medium controls, have the official empty answer set. Golden drops an empty
metadata array, so the release omits `plausible_flags` and the judges read the control markers.
The 10 medium tasks are not in the public 755 and are not a paper tier. The 8 medium
incident tasks have no official answer set, so `plausible_flags` is omitted and they stay out of
any quoted ORCA accuracy or hallucination number:
`d6-big-cartfailure-on-02-medium_ttd60m_range30m_off+10m`,
`d5-ic2-adfailure-on-03-medium_ttd480m_at_off+10m`,
`d3-d2dep-paymentfailure-10-02-medium_ttd480m_period_previous-period`,
`d4-d3dep-paymentunreachable-on-03-medium_ttd1440m_day_same-day`,
`d3-ic1-loadgeneratorfloodhomepage-on-02-medium_ttd60m_range30m_off+10m`,
`d1-c1-admanualgc-on-02-medium_ttd15m_at_off+10m`,
`d1-i1-imageslowload-on-02-medium_ttd480m_period_previous-period`,
`d2-cc1-adfailure-on-02-medium_ttd1440m_day_same-day`.
v4 differs from v3 in three ways. Its questions no longer name the ORCA indices. Every task records
`telemetry_snapshot_time`: the 40 public tasks copy their Harbor task's, and the 10 medium tasks
take the first snapshot strictly after `current_time` plus five minutes among the 125 snapshots the
public tasks name. That choice is exact, because each lands under 5 minutes before the next known
snapshot and ORCA's snapshots are at least 300 s apart; the same rule reproduces all 664 public
snapshots outside ORCA's last-snapshot fallback. The 40 public tasks carry `orca_expected`.
`nightshift/orca-sampled50-v3` and `-v2` are unchanged.

The previous run of this pinned 50 is the 28 October 2026 Sonnet 4.6 investigation
`bk-01a184b7-e436-462e-9b4b-015d32c3ae77` on `nightshift/orca-sampled50-v2`. Its mean `goal_pass`
was 0.515. That number is not ORCA accuracy: the release had no plausible-flag set, so the ORCA
scores were not available. The 42-question `goal_pass` numbers are a different eval. The latest
stored run, 21 October 2026 `bk-01a1606b-fecd-479e-b2ae-eb4eedb78385` on
`nightshift/orca-ech-full-20261019`, has mean `goal_pass` 0.875. A flag-query split on that eval,
where 39 of 42 investigations touched `feature_flag.key` and mean `goal_pass` was about 0.89, is
a correlation and is not ORCA accuracy.

Do not compare these scores with the paper's published rates yet. This agent reads telemetry with
ES|QL and reaches the Astronomy Shop source by cloning it; the paper's agents have a checkout and
Grafana (Prometheus, Jaeger, OpenSearch), an hour per task, and a `report.md` graded by ORCA's own
judge. The closer paper baseline is the telemetry-only Sonnet 4.6 result, 21.4%,
against 30.9% for the same model with code. The 40 matched tasks above are the Verified view, so
a later writeup may quote Verified only for those 40, still with this tool-surface caveat. The
paper's 25.3% and 10.0% are not like-for-like.

### Public 755

`nightshift/orca-bench-public755-v2` (`7e7dd22d-83fb-54a5-9e51-dd2b67def0ef`, 755 examples, sha256
`f6a6f74aba362adb3dfe2882422f1ea23c1fb0db4169116579b42c38d45777a1`) holds every task of the public
Harbor dataset above: 617 incident tasks and 138 controls, with tiers easy 245, hard 264 and
universal 246. The tiers are the question's granularity, not the paper's difficulty: the paper's
Easy, Medium and Hard (`orca_difficulty`) are our `easy`, `hard` and `universal`, one to one. Each
example is built from its Harbor task:

- `case_id` is the name whose `sha256` prefix is the task's package name, and `harbor_task` is
  the package. Every one of the 755 resolves to exactly one name.
- The question uses the task's stated current time, `reported_styled` and `user_facing_issue`,
  in the same wording as `nightshift/orca-sampled50-v4`. On the 40 tasks both releases hold, the
  questions, flag sets, current times and snapshot times are identical.
- `plausible_flags` is the set of `events[].root_cause` keys. On 77 incident tasks it does not
  contain the flag the `qid` names, for example `d1-n1-loadGeneratorFloodHomepage-on-00-hard`,
  whose answer is `imageSlowLoad`. That set is ORCA's answer.
- The reference answer is the rubric description and mechanism of the task's first event, so
  `goal_pass` and RCA accuracy read the same cause. Four v3 incidents describe the `qid` flag
  instead.
- `difficulty` is the tier (easy, hard or universal), as in v3, and `orca_difficulty` is the
  task's own difficulty label. Controls carry `quiet_window` from the task. Ten of them have no
  start.
- `telemetry_snapshot_time` is the snapshot named in the task's environment.
- `orca_expected` is the task's `tests/expected.json`.
- v2 differs from v1 only in that its questions no longer name the ORCA indices, and in
  `orca_expected`. `nightshift/orca-bench-public755-v1` is unchanged.

Every root-cause event of the 755 falls inside the ORCA cluster's data. Its logs, traces and
metrics each cover every hour from 2026-04-19T03:00Z through the 2026-04-24T19:00Z hour, which
holds ORCA's last snapshot.

The 755 is a periodic baseline, not a CI shard. The `orcabench` shard budgets 240 minutes for 50
tasks, and release-gate issue elastic/nightshift-program#1893 wants gates under 30 minutes. At
eight investigations at a time the 755 needs tens of hours, so run it in slices. The score API
returns at most 10,000 scores per experiment, so a run that would write more (the unsliced 755
writes about 13,600) fails before any investigation starts.
`NIGHTSHIFT_ORCA_RELEASE=public755` selects the release, and `NIGHTSHIFT_ORCA_SLICE=<index>/<count>`
runs one contiguous part of it in `case_id` order. Each run validates the whole release before
slicing. A slice runs as its own dataset, `nightshift/orca-bench-public755-v2/slice-<index>-of-<count>`,
because the eval client upserts the dataset it runs, and under the release name a slice would
remove the other tasks. The eval stores the slice first and runs it with the example ids the
server gave it, so its scores show up in each example's history in the Evals UI. Keep one `<count>` for a baseline and join the slices on `case_id`.

Report the 755 by `orca_difficulty` (Easy, Medium, Hard), so a rate is read against the paper's
tier of the same name, with `execution_success` and the number of unscored runs next to each
rate. Quote the 40 sampled tasks against Verified only with the task-by-task match above. The 10
medium tasks in the sampled 50 are their own line and are not a paper tier. The headline run keeps
flag telemetry visible.

The flag ablation runs the same agent, tasks and judge with every flag document hidden:
flagd's own logs, spans and metrics, any document with a `feature_flag` field, flag-evaluation
spans, and log lines that name a flag (`ORCA_FLAG_DOCUMENTS_QUERY` in
[`orca_cutoff.ts`](evals/investigation/orca_cutoff.ts)). Set
`NIGHTSHIFT_ORCA_TELEMETRY_VARIANT=no-flags` and each cutoff key's document-level security becomes
`{"bool": {"filter": [<the cutoff range>], "must_not": [<the flag documents>]}}`, so no query the
agent writes can bring them back. It needs no other credential. The preflight then expects the
flag-free counts and no flag document through any key, and every score records
`telemetry_variant: no-flags`.

```bash
NIGHTSHIFT_DATASETS=orcabench NIGHTSHIFT_ORCA_TELEMETRY_VARIANT=no-flags \
  NIGHTSHIFT_ORCA_RELEASE=public755 NIGHTSHIFT_ORCA_SLICE=1/8 \
  node scripts/evals start --suite nightshift-investigations --profile dev-vault
```

The Nightshift Vault config must hold a `nightshiftOrcaEs` block (see
[`vault/config.example.json`](vault/config.example.json)) with the ORCA cluster's `url` and the
`username` and `password` of the eval user above. The Scout hook refuses an ORCA run without them,
and exports them only to the ORCA shard.

- The dataset's ID, case count and content digest are pinned in
  [`orca_dataset.ts`](evals/investigation/orca_dataset.ts). A changed release fails before any
  investigation starts, as does a source or key that fails the [preflight](#telemetry-cutoff).
- Each task runs once, at most eight at a time, and Playwright doesn't retry the test.
- The eval fails when fewer than 80% of investigations complete, or when none returned ORCA
  telemetry. Judge scores are advisory.
- Both shards draw on one sandbox pool. When it runs out, investigations end without a
  conclusion and the eval fails, so leave room for overlapping builds.

Locally, start a fresh Scout server for ORCA:

```bash
NIGHTSHIFT_DATASETS=orcabench node scripts/evals start \
  --suite nightshift-investigations --profile dev-vault

# One slice of the public 755
NIGHTSHIFT_DATASETS=orcabench NIGHTSHIFT_ORCA_RELEASE=public755 NIGHTSHIFT_ORCA_SLICE=1/8 \
  node scripts/evals start --suite nightshift-investigations --profile dev-vault
```

The ORCA telemetry is CC BY 4.0; keep the dataset's attribution when sharing results.

## CI

Registered in [`evals.suites.json`](../../../../../.buildkite/pipelines/evals/evals.suites.json)
as `nightshift-investigations`.

- **Where it runs:** a serverless observability Scout cluster; `run_suite.sh` reads `scoutArch` /
  `scoutDomain` from the suite entry.
- **What runs:** a `customer0` shard with the smoke and trace-only evals, and an `orcabench`
  shard with the ORCA benchmark. The suite's ci-prod secret,
  `kv/ci-shared/kbn-evals/nightshift`, must hold the `sandbox` block;
  `.buildkite/scripts/steps/evals/run_suite.sh` reads it and runs the suite's `scoutHook` on it
  before starting Scout (failing the step if it cannot be read), and Buildkite agents must be able
  to reach the sandbox-api host.
- **On a PR:** add the `evals:nightshift-investigations` label plus a `models:` label (for example
  `models:eis/anthropic-claude-5.5-sonnet`) to choose which model investigates. Without a `models:`
  label the suite is skipped, like other suites that run the real agent.
- **Weekly:** a step in [`llm_evals.yml`](../../../../../.buildkite/pipelines/evals/llm_evals.yml)
  runs it against Sonnet 5.5, GPT 5.6 Sol and GPT 5.6 Terra, set by
  `weeklyEisModelGroups` in the suite entry.
- **Failures** are posted to `#nightshift-alerts`, resolved from `slackChannel` in the suite entry.
- **Scores** reach the golden cluster automatically, through `EVAL_KBN_URL` in CI.

## Validation

```bash
node scripts/jest x-pack/solutions/observability/packages/kbn-evals-suite-nightshift-investigations
node scripts/type_check --project x-pack/solutions/observability/packages/kbn-evals-suite-nightshift-investigations/tsconfig.json
node scripts/check.js --scope=local
```

The native trace-only run above is the end-to-end acceptance seam. Unit tests cover malformed
datasets and task failures, including preserving partial evidence when workflow details fail.
