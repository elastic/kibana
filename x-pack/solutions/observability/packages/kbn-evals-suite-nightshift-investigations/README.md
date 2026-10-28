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

For model and judge selection, `--grep` and repetitions, see [running evals locally](../../../../platform/packages/shared/kbn-evals/README.md#11-getting-started-locally). This suite does not override any of those flags.

## Trace-only investigations

This selection runs code in the shared sandbox-api on GCP. Its credentials are already in the dev
Vault, so run with `--profile dev-vault` and there is nothing to configure:

```bash
# Every eval (smoke + trace-only); prefix NIGHTSHIFT_DATASETS=trace-only to run only this one
node scripts/evals start \
  --suite nightshift-investigations --profile dev-vault \
  --model eis-anthropic-claude-5-5-sonnet \
  --judge eis-anthropic-claude-4-6-sonnet
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
and sandbox, disables Cortex, and exports full Agent Builder payloads (user messages, system
instructions, responses, tool arguments/results and conversation IDs) to the profile's configured
destination. Trace-exporter headers and remote telemetry credentials reach Kibana through
environment references in committed YAML, without generated secret files or credential arguments.
Full payloads have the destination's access controls; use synthetic questions or data
you are allowed to export there. Existing sandbox connector authorization remains unchanged.

To run another file with the same loader and task:

```bash
NIGHTSHIFT_DATASETS=trace-only NIGHTSHIFT_EXAMPLES_FILE=/absolute/path/examples.json \
  node scripts/evals run --suite nightshift-investigations --profile dev-vault \
  --model eis-anthropic-claude-5-5-sonnet --judge eis-anthropic-claude-4-6-sonnet
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
  --judge eis-anthropic-claude-4-6-sonnet
```

`NIGHTSHIFT_DATASET_NAME` selects trace-only investigations when `NIGHTSHIFT_DATASETS` is unset.
It reads the dataset from the results profile's Kibana, in the first `--space-ids` Space (default: `default`). It preserves the original dataset
and example IDs, labels, tags and metadata through `trustUpstreamDataset`. The existing runner
upserts the fetched dataset before running; skipping that write is a separate framework follow-up. Its examples
must satisfy the same question and distinct `case_id` requirements as a file. Do not combine it
with `NIGHTSHIFT_EXAMPLES_FILE`. The dataset's telemetry source still needs the sandbox and remote
telemetry settings below; selecting a dataset does not provision its source data.

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

## Remote telemetry investigations

Use the same `trace-only` selection, dataset loader, investigation task, placeholder evaluator and
trace acceptance checks to investigate an operator-configured Elasticsearch cluster. The telemetry
source is independent of the evaluations profile: the sandbox queries the remote cluster, while
the profile still selects where experiment results and agent traces are persisted.

Configure a dedicated API key restricted to `read` and `view_index_metadata` on the telemetry
patterns the example needs, with only the cluster privileges required for discovery. For
cross-cluster search, verify that the key can read the intended remote and index pattern. Keep
endpoints, keys and readable-index hints in Vault (or a private local profile JSON), and customer
example files private and uncommitted.

Add a `nightshift.telemetry` block beside `sandbox` in this suite's Vault secret (see
[rotating Nightshift secrets](#rotating-nightshift-secrets)) or local profile JSON. The suite hook
reads it without adding Nightshift fields to the shared CLI or global config schema:

```json
"nightshift": {
  "telemetry": {
    "url": "https://telemetry.example.com",
    "apiKey": "...",
    "readableIndices": "Read remote-a:logs-service-*"
  }
}
```

`url` and `apiKey` are required together; `readableIndices` is optional. Profile values take
precedence over the following shell fallbacks. The hook selects the telemetry YAML only when the
URL and key are configured, and requires sandbox credentials for remote investigations.

| Variable | Purpose |
| --- | --- |
| `NIGHTSHIFT_SANDBOX_ELASTICSEARCH_URL` | Remote Elasticsearch endpoint. Requires the API key below. |
| `NIGHTSHIFT_SANDBOX_ELASTICSEARCH_API_KEY` | Encoded restricted API key, without the `ApiKey` prefix. Requires the URL above. |
| `NIGHTSHIFT_SANDBOX_READABLE_INDICES` | Optional manifest guidance naming readable index patterns and explicit remote names (up to 10,000 characters). |
| `NIGHTSHIFT_EXAMPLES_FILE` | The same file format documented above; only questions and stable case IDs are required. |

With those variables and the sandbox credentials configured:

```bash
NIGHTSHIFT_DATASETS=trace-only NIGHTSHIFT_EXAMPLES_FILE=/private/path/examples.json \
  node scripts/evals start --suite nightshift-investigations --profile dev-vault \
  --model eis-anthropic-claude-5-5-sonnet --judge eis-anthropic-claude-4-6-sonnet
```

The committed [`scout/kibana.telemetry.yml`](scout/kibana.telemetry.yml) creates the preconfigured `nightshift-evals-telemetry` HTTP (`.http`) connector with a secret
`Authorization` header. The existing credential resolver authorizes connector access and execution,
checks the agent's allow-list, and exposes the API key only to the requesting sandbox command.
Remote telemetry and sandbox credentials are supplied through the hook environment.
`/workspace/elastic.md` contains variable names and query guidance, never credential values. Its
examples bound requests by time and advise using explicit remote names and narrow index patterns.
These are instructions for the agent; the API key's privileges enforce the read restrictions.

Choose an example whose required telemetry is still retained and verify a bounded query with the
restricted key first. For connectivity acceptance, inspect the persisted agent trace's command and
actual Elasticsearch response: confirm it queried the configured endpoint through the telemetry
connector and returned data from the intended remote/index and time range without query or remote
failures. Record the tested commit, experiment and trace links, plus sanitized query evidence. A
`connector_id`, exit code zero, completed investigation or placeholder score alone does not prove
connectivity. This workflow remains ungraded and requires no reference answer or quality threshold.

Leave the remote settings unset for the bundled synthetic examples;
synthetic execution continues to need no telemetry connector. The former `remote` selection and
`NIGHTSHIFT_REMOTE_EXAMPLES_FILE` are replaced by this shared file workflow. Grading, snapshot
provisioning and micro-evals are separate follow-ups.

## Connector probes

`NIGHTSHIFT_DATASETS=connector-probe` asks the hidden **Nightshift Assistant** agent
(`nightshift.assistant`) each question in one `POST /api/agent_builder/converse` call. The
assistant has the investigator's tools, connectors, Cortex and Semantic Memory hooks, but a short
direct-answer prompt that reads the workspace `.md` files only when needed, and no decision trees,
so a probe takes a few model turns instead of a full investigation. Use it to iterate quickly on
how the agent queries Elasticsearch. Cortex and memory optimize still run after each reply, so
probes update the space's wiki and memories like investigations do.

It is opt-in: unset and `all` never select it, because it needs the
[remote telemetry](#remote-telemetry-investigations) settings as well as sandbox credentials.

```bash
NIGHTSHIFT_DATASETS=connector-probe NIGHTSHIFT_PROBE_EXAMPLES_FILE=/path/to/probes.json \
  node scripts/evals start --suite nightshift-investigations --profile dev-vault --repetitions 1 \
  --model eis-anthropic-claude-5-5-sonnet --judge eis-anthropic-claude-4-6-sonnet
```

Probes are not bundled: they name a real cluster's remotes and data streams, so they live outside
the repository. `NIGHTSHIFT_PROBE_EXAMPLES_FILE` points at a file in the
[same format](#trace-only-investigations) as trace-only investigations, where each example's
`output.reference_answer` describes the expected behaviour. Write questions with a relative time
window and references that grade behaviour rather than counts, so they stay valid week to week. Give
a subset its own `dataset` name so it does not replace the stored full set.

| Evaluator             | Kind | Scores                                                                       |
| --------------------- | ---- | ---------------------------------------------------------------------------- |
| `connector_used`      | CODE | At least one `nightshift_sandbox_bash` call passed a `connector_id`.         |
| `within_time_budget`  | CODE | The `converse` call finished within `NIGHTSHIFT_PROBE_TIME_BUDGET_S` (30).   |
| `reference_behaviour` | LLM  | The reply and tool calls match the example's `output.reference_answer`.      |

Set `SELECTED_EVALUATORS=connector_used,within_time_budget` to skip the judge. Each run logs its
case, duration, tool-call count, conversation and trace ids and scores. A failed `converse` call
fails the test; low scores do not.

## Writeup

`NIGHTSHIFT_DATASETS=writeup` rewrites the agent's final reply from a recorded investigation under
a given prompt, and scores how it's written up. No investigation runs: for each recorded round it
rebuilds what the model saw just before it replied, and asks it to write that reply again under the
investigator prompt in your checkout (or another one, below). A run takes minutes and changes only with the prompt, the model and the judge, so it can
show a prompt change's before and after. How well the agent investigates is the end-to-end evals'
job (trace-only and ORCA above).

It is opt-in: unset and `all` never select it. It needs model connectors but no sandbox or
telemetry, so it runs on a plain Scout server:

```bash
NIGHTSHIFT_DATASETS=writeup node scripts/evals start \
  --suite nightshift-investigations --profile dev-vault --scout-arch stateful \
  --model eis-anthropic-claude-5-sonnet --judge eis-anthropic-claude-5-opus
```

`--model` writes the replies (Sonnet 5 wrote most production rounds) and `--judge` scores them.
Use a judge from another family than the model, or at least a different model, so nothing grades
its own writing.

### How a reply is rewritten

- **Input** ([`replay.ts`](evals/writeup/replay.ts)): the prompt under test as the system
  prompt, then every earlier round as Agent Builder renders it (user message, tool calls with
  results, the reply it sent), then the rewritten round's user message and tool calls, including the
  agent's recording calls. Steps are read with the plugin's own `stepsFromRound`. Results stay whole
  up to 20,000 characters within a 420,000-character budget; earlier rounds are clipped first.
- **Output**: the model's next message, as free markdown. Tools stay declared, plus
  `attachments.add`, which Agent Builder always offers, so the model may still call one before it
  replies, as it can in production. Recording calls get a plain success, an attachment is kept so a
  judge can read what the reply shows, and queries get "No new results." (an error that named the
  replay came back in replies as "Let me finalize my reply"). Extra calls are listed in the report.
- **Still different from production**: Agent Builder wraps the prompt in its own instructions and
  compacts history its own way, earlier thinking isn't replayed, and tool calls stay as recorded,
  so a prompt that would have queried differently can't show it.

### Scores

| Evaluator            | Kind | Scores                                                                                       |
| -------------------- | ---- | -------------------------------------------------------------------------------------------- |
| `reply_generated`    | CODE | The model wrote a reply. The eval fails when fewer than 80% of rounds get one.               |
| `reply_gates`        | CODE | 1 when every gate below passes; the failed gates are in the explanation.                     |
| `reply_words`        | CODE | Words in the reply. Neutral: shorter only helps while nothing the reader needs is lost.      |
| `reply_faithfulness` | LLM  | 1–5 against everything the agent had seen, normalized to [0, 1], with unsupported claims.    |
| `reply_vs_golden`    | LLM  | Pairwise against the round's golden reply, in both orders; a tie counts half.                |
| `reply_vs_baseline`  | LLM  | Pairwise against the baseline prompt's reply, when `NIGHTSHIFT_WRITEUP_BASELINE_PROMPT` is set. |

Each round is tagged with the kind of reply its question calls for. Short: `wrapup` (the
investigation's first message), `answer` (a direct follow-up), `summary` and `action` (a request to
do something). Long, where the user asked for more: `method` (how a result was produced), `list`,
`detail` (an explanation or walk-through) and `visual`. A round without a tag is a wrap-up when it
opens the conversation and an answer otherwise.

The gates ([`gates.ts`](evals/writeup/gates.ts)) read the markdown the model wrote. Every reply
needs a first sentence of 22 words or fewer, every number of two or more digits found in what the
agent saw, no method narration ("I queried…") unless the question asked for the method, and no
table over 12 rows (a longer list belongs in an attachment). A short reply also gets at most 100
words, at most 3 points (a wrap-up without points: at most 4 sentences), 90% or more of sentences at
20 words or fewer, and no headings or bold labels. A long reply gets a word cap by type (method 300,
list 200, detail 400, visual 150) and nothing else on its shape. Table rows count toward neither
words nor sentences. A reply that mentions an attachment ("attached", "the table above") must show
one with a `<render_attachment>` tag. The minimum length doesn't apply when a table or an
attachment carries the answer, and tag lines are skipped when finding the first sentence.

The pairwise judge ([`judges.ts`](evals/writeup/judges.ts)) reads what the agent had seen, what the
investigation panel shows (summary, verdict, impact, hypotheses, proposed actions), the latest
message and the two replies, with each attachment a reply shows written out where its tag sits. It
doesn't see the reply type or the prompt's rules: it picks the reply this reader would rather get,
judging correctness first, then whether it leads with what matters, fits what the question asked
for, and is easy to follow. Terser isn't better by itself, and a reply that restates the panel
loses. Its rubric was checked against a person's blind picks on 30 replayed pairs; the report splits
the head to head into short questions and requests for more, since a prompt can win one and lose
the other.

Each run prints a summary table with one row per prompt, plus `recorded`, the reply the
conversation actually got, and writes `report.md` and `results.json` under
`data/nightshift_writeup/runs/`. The report quotes every reply next to its golden, lists
unsupported claims, and names **ratchet** candidates: replies that pass every gate, score at least
4 on faithfulness and win at least five of every six golden comparisons. A person reviews a
candidate before it replaces its golden in the fixtures.

### Before and after a prompt change

Run on `main` for a baseline, then on the prompt branch. To score both prompts in one run and add a
head-to-head comparison, point `NIGHTSHIFT_WRITEUP_BASELINE_PROMPT` at a git ref or a prompt file.
`NIGHTSHIFT_WRITEUP_PROMPT` does the same for the prompt under test, which otherwise is the
checkout's, so a branch's prompt can be measured without switching to it:

```bash
NIGHTSHIFT_DATASETS=writeup NIGHTSHIFT_WRITEUP_BASELINE_PROMPT=origin/main \
  node scripts/evals run --suite nightshift-investigations --profile dev-vault \
  --model eis-anthropic-claude-5-sonnet --judge eis-anthropic-claude-5-opus
```

Replies are cached under `data/nightshift_writeup/cache/` by round, model, prompt and
repetition, so a re-run only makes judge calls (`NIGHTSHIFT_WRITEUP_CACHE=off` regenerates). One
repetition per round is usually enough to compare prompts, since averaging over rounds evens out a
single reply's randomness. Use `--repetitions 2` or more before replacing a golden, which is decided
per round, or when two prompts are only a few words apart.

### Judge agreement

Because replies are cached, re-running with another `--judge` scores the same replies. Compare the
runs, reference judge first, with the suite's writeup CLI (run from the repository root):

```bash
node -r @kbn/setup-node-env x-pack/solutions/observability/packages/kbn-evals-suite-nightshift-investigations/scripts/writeup judge-agreement \
  data/nightshift_writeup/runs/<opus run>/results.json \
  data/nightshift_writeup/runs/<gpt run>/results.json
```

It reports pairwise results per judge, per-round winner agreement, faithfulness correlation, and
how often the shorter reply wins. In the prototype this eval was ported from, judges from three
families agreed on which prompt wrote better replies, but not on the faithfulness scale, and every
judge preferred the shorter reply most of the time. So treat faithfulness as a rough signal until
a person calibrates it, don't claim "no faithfulness loss" from one judge, and lean on the gates and
human review to catch a short reply that drops something the reader needs.

### Datasets

The committed dataset, `nightshift/writeup`, holds five synthetic ORCA investigations
(the OpenTelemetry Demo shop; the ORCA telemetry is CC BY 4.0) in
[`evals/writeup/fixtures/orca/`](evals/writeup/fixtures/orca), one file each. Each ran on
`main` with Sonnet 5 and then got two scripted follow-up questions, so every conversation has its
first-round wrap-up and two question replies rewritten. Their goldens are seeded from variant B's brief
of the reply each round got (an answer line and up to three points), as the prototype's were.

None of those questions asks for more, so each file also has a `follow_ups` entry: one request for
a walk-through, a list, the queries, a chart or a timeline, asked after the last round. The context
is real; only the question is added, so it has no recorded reply and no golden. Rebuilding the
fixtures keeps each file's `follow_ups` and `reply_types`.

Customer 0 conversations must not be committed. Keep them in a private conversations file and run
it directly, or store it once as an evaluations dataset and select it by name:

```bash
# Build a private file from exported conversations (Agent Builder GET /api/agent_builder/conversations/{id})
node -r @kbn/setup-node-env x-pack/solutions/observability/packages/kbn-evals-suite-nightshift-investigations/scripts/writeup build --out ~/private/writeup-c0.json \
  --dataset nightshift/writeup-c0 --rounds last exports/*.json

# Run it; the executor stores it under its dataset name in the profile's evaluations cluster
NIGHTSHIFT_DATASETS=writeup NIGHTSHIFT_WRITEUP_EXAMPLES_FILE=~/private/writeup-c0.json \
  node scripts/evals start --suite nightshift-investigations --profile dev-vault ...

# Later runs read the stored dataset
NIGHTSHIFT_DATASETS=writeup NIGHTSHIFT_DATASET_NAME=nightshift/writeup-c0 \
  node scripts/evals run --suite nightshift-investigations --profile dev-vault ...
```

`--prototype-goldens <dir>` reads the prototype's last-round goldens, and `--goldens <file>` any
others, keyed by case id. The dataset upsert route caps a dataset at 5 MiB, so `build` clips tool
results to `--result-cap` characters (8,000 by default) and refuses data that would not fit;
`--rounds last` rewrites only each conversation's final reply. To refresh the ORCA conversations,
export them again and rebuild with `--fixtures-dir evals/writeup/fixtures/orca`.

## Deferred sandbox session isolation

The shared sandbox workspace is scoped to a space and conversation, not to an agent's connector
allow-list or a user's current execution privileges. Telemetry hints are authorized before seeding
and cleared when access or configuration is removed, but overlapping calls with different
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

| Variable              | Effect                                                                                                                                                                                                                                                                                              |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NIGHTSHIFT_DATASETS` | Comma-separated dataset ids (whitespace trimmed). Smoke dataset ids such as `synthetic-smoke` select seeded evals; `trace-only` selects the file-driven investigations; they can be combined, e.g. `synthetic-smoke,trace-only`. Unset or `all` runs every eval when sandbox credentials are present, except that a stored `NIGHTSHIFT_DATASET_NAME` defaults to trace-only when selection is unset. Without them, unset runs only smoke with a warning, while an explicit `all` or `trace-only` fails before any test runs, even when Scout is reused. `connector-probe` selects the [connector probes](#connector-probes) and `writeup` the [writeup eval](#writeup); unset and `all` never include either. `orcabench` selects the isolated ORCA dataset and cannot be combined with other ids; it requires an ORCA-configured Scout server. Unknown ids fail early. |
| `NIGHTSHIFT_PROBE_EXAMPLES_FILE` | Examples file for `connector-probe`; required when it is selected. See [connector probes](#connector-probes). |
| `NIGHTSHIFT_PROBE_TIME_BUDGET_S` | Seconds a probe may take before `within_time_budget` scores 0 (default 30). |
| `NIGHTSHIFT_WRITEUP_EXAMPLES_FILE` | Private conversations file for `writeup`. See [writeup](#writeup). |
| `NIGHTSHIFT_WRITEUP_PROMPT` | Git ref or prompt file the writeup eval tests instead of the checkout's investigator prompt. |
| `NIGHTSHIFT_WRITEUP_BASELINE_PROMPT` | Git ref or prompt file the writeup eval also rewrites replies under, and compares head to head. |
| `NIGHTSHIFT_WRITEUP_VOTES` | Pairwise votes per order for the writeup judges (default 2). |
| `NIGHTSHIFT_WRITEUP_CACHE` | `off` regenerates writeup replies instead of reading the cache. |
| `SELECTED_EVALUATORS` | Standard `@kbn/evals` filter, by evaluator name (`documents_restored`, `timestamps_replayed`).                                                                                                                                                                                                      |
| `GCS_CREDENTIALS`     | Service account JSON Elasticsearch uses to reach the seed-data bucket. Read access is enough to run the suite.                                                                                                                                                                                      |

Because every eval dataset gets its own `describe` block, Playwright's `--grep` filters by dataset id as well.

```bash
NIGHTSHIFT_DATASETS=synthetic-smoke node scripts/evals run --suite nightshift-investigations
```

## ORCA benchmark

`orcabench` runs ORCA's 50 sampled tasks from the Golden dataset `nightshift/orca-sampled50-v2`
against the ORCA telemetry cluster: 40 incident tasks over 28 incidents and 10 no-incident
controls. Each question uses ORCA's own wording: a stated current time, a vague or offset report
time and the user-facing symptom, without the incident onset or an analysis window. The cluster
holds all six days, so an agent can still read telemetry after the stated current time; each
example records it as `metadata.current_time`. CI runs it as its own shard under the
`evals:nightshift-investigations` label, next to the `customer0` shard that runs the smoke and
trace-only evals, so each Scout server's telemetry connector points at one cluster.

The Nightshift Vault config must hold a `nightshiftOrcaEs` block (see
[`vault/config.example.json`](vault/config.example.json)) whose key can only `read` and
`view_index_metadata` on `logs-orcabench.otel-*`, `traces-orcabench.otel-*` and
`metrics-orcabench.otel-*`. An optional `readableIndices` in that block replaces the index hint
the agent's manifest gets.

- The dataset's ID, case count and content digest are pinned in
  [`orca_dataset.ts`](evals/investigation/orca_dataset.ts). A changed release fails before any
  investigation starts, as does a source whose document counts differ from the snapshot.
- Each task runs once, at most eight at a time, and Playwright doesn't retry the test.
- The eval fails when fewer than 80% of investigations complete, or when none returned ORCA
  telemetry. Judge scores are advisory.
- Both shards draw on one sandbox pool. When it runs out, investigations end without a
  conclusion and the eval fails, so leave room for overlapping builds.

Locally, start a fresh Scout server for ORCA; a reused server keeps its connector credentials:

```bash
NIGHTSHIFT_DATASETS=orcabench node scripts/evals start \
  --suite nightshift-investigations --profile dev-vault
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
  runs it against the weekly core models (`weekly_eis_core_models`).
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
