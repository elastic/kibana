# @kbn/evals-suite-semantic-log-search

Measures whether semantic log search returns better log messages than what ships today, and what
it costs to do so.

## The arms

Every arm answers the same questions over the same corpus. They differ only in what the caller is
allowed to use.

| Arm | What it is | Where |
|---|---|---|
| `keyword` | `get_logs` with a KQL filter built from the question | `evals/retrieval` and `evals/agent` |
| `groups` | `get_log_groups` with the same KQL filter as `keyword`, frequency-ordered | `evals/retrieval` only |
| `semantic` | `get_logs_semantic` with `semanticFilter` set to the question | `evals/retrieval` and `evals/agent` |
| `baseline` | The default agent, which has no log-specific tool | `evals/agent` only |

`evals/retrieval` executes the tool directly, with no model in the loop. `evals/agent` goes through
`converse`, which is where token cost, latency and answer quality become measurable. Each arm gets
exactly one tool to isolate the retrieval comparison.

**Arms are comparable within a run; runs are not comparable with each other.**

Profiles are authored as `timeRange: { start: 'now-2h', end: 'now' }`. `beforeAll` resolves that
once, after any seeding, via `resolveCorpusWindow`, and every arm then queries the same absolute
window. Before this, `now` was re-evaluated per request and seeded data aged out mid-run: three
consecutive runs against one unchanged 2,632-document seed audited 2,593, then 2,447, then 2,333.

Across runs, two things still move and neither is worth removing:

1. **The window follows the data.** Each run resolves a fresh window, which is what keeps the
   corpus in the hot tier instead of pinning to a date that would eventually age out.
2. **Sampling is unseeded on one side.** `get_logs` samples with a fixed seed; ES|QL `SAMPLE` takes
   none, so once a corpus is large enough for sampling to engage (the scale corpus, by design) the
   semantic arm draws different documents each time and its counts are extrapolated estimates.

Latency carries two further conditions. It is only comparable at the same concurrency (the
retrieval specs pin `concurrency: 1`) and at the same **allocation count**, because rerank
cost divides by it: identical input measured 2,311 ms at one allocation and 875 ms at three, and
`adaptive_allocations` moves the number mid-run on its own. The semantic arm logs the count once it
finishes, which is the earliest it can be known: the reranker deploys on its first call, and that
arm is the only one that makes one. It is also endpoint-specific, since the same candidates took
147 ms through a hosted reranker. See
[Measuring latency properly](./SETUP.md#measuring-latency-properly).

### Why the `groups` arm exists

Every arm receives the same question. Only the tool varies, so a difference between arms is
attributable to the tool rather than to what each one was told. `get_log_groups` has no semantic
parameter, so it receives the question through `kqlFilter`, built by the same `toKeywordFilter` the
keyword arm uses.

With the filter held constant, `groups` versus `semantic` isolates the **ranking**: frequency order
against relevance order, over the same grouped output. That is the comparison that says what
semantic understanding is worth.

**`keyword` and `groups` return the same patterns, measurably.** Given the same KQL filter they were
byte-identical on all 8 examples of one run, in content, order and count. Both derive their grouped
list from the same `categorize_text` aggregation on `message`; `get_logs` simply wraps a histogram,
`topValues` and raw samples around it. So there is no output-shape effect for a retrieval metric to
detect, and the two arms are interchangeable for scoring purposes. The difference between them is
what else an *agent* receives, which only the agent arms can measure.

Keeping both is still worth it: identical scores are a strong signal that the shared filter is
reaching both tools, and a divergence would mean one of them changed how it groups.

An earlier version of this arm passed no question at all, on the theory that a pure frequency
baseline was the cleaner control. It was not: it returned one fixed set of 20 of the corpus's 60
groups for all 8 questions, so its scores measured the size of the pattern space rather than any
retrieval behaviour. It did leave one finding worth keeping, recorded under Metrics: **Recall
reached 0.79 without reading the question at all**, so Recall is close to saturated on this corpus
and the ordering metrics are the ones carrying signal.

Two limits, both in the tool rather than in this suite:

- **Ordering is only reliable while no APM error data is present.** The handler truncates before it
  sorts, so the result is the first N in concatenation order, then sorted by count, rather than the
  top N by count. Span exceptions are concatenated first and can crowd out higher-count log groups.
  The arm drops span exceptions and reports the count as `droppedNonLogGroups` in evaluator
  metadata, so a non-zero value there means this is live.
  https://github.com/elastic/kibana/blob/521fcde884e0/x-pack/solutions/observability/plugins/observability_agent_builder/server/tools/get_log_groups/handler.ts#L145
- **Counts are exact only below roughly 20 000 matching documents.** Above that the tool samples and
  uses `random_sampler` doc counts raw, without dividing back by the probability, which breaks the
  `count` contract the document-weighted metrics rely on. `Count Sanity` cannot catch it, because
  this tool sends no `totalCount` and both of its guards require one. **The scale corpus is
  therefore unsupported for this arm.**
  https://github.com/elastic/kibana/blob/b539ca309483/x-pack/solutions/observability/plugins/observability_agent_builder/server/tools/get_log_groups/get_categorized_logs.ts#L104

**Candidate budget**: every arm receives the same number of patterns. Every registered corpus sets
`maxPatterns: 20`, which is also the tool parameter's ceiling; the tool's own default, unused here,
is 10. The semantic tool is server-side capped at that value; the keyword tool returns up to ~60
categories and is capped client-side so Recall cannot be inflated by giving one arm more surface
area.

## Corpus profiles

The suite supports multiple corpora. Each corpus is defined in `src/corpora/` as a `CorpusProfile`:

- **Target**: the data stream or index pattern where the corpus lands.
- **Time range**: when the data was generated.
- **Message classes**: categories of log messages, labelled by meaning rather than vocabulary.
- **Queries**: the questions to ask, with graded ground truth and lexical traps.
- **Parameters**: `k`, `relevanceThreshold`, and `maxPatterns` for the metrics.

### Registered corpora

| Id | Description |
|---|---|
| `sigevents_postgres_timeout` | Small corpus (~2h of `postgres_timeout`, < 50k docs). Exercises the single-pass CATEGORIZE branch. |
| `sigevents_postgres_timeout_scale` | Scale corpus (same labels, `baseRate=25`, measured 63,627 docs). Exercises the two-pass sampled head/rare CATEGORIZE branch. Verify the manifest reports > 50,000 before trusting a result. |
| `sigevents_fraud_check_redis_herring` | Redis/fraud corpus with different message classes and semantic traps. |

**Why two postgres_timeout profiles?** The service's `collectCandidates` picks one of two code
paths by document count. At or below 50,000 documents it runs a single unsampled pass; above it,
a sampled head pass plus a rare pass. The rare pass is the part worth measuring: selecting
candidates by frequency alone drops low-count patterns, and the pattern an incident question is
reaching for is usually a rare one. The small corpus exercises the single-pass path; the scale
corpus exercises the sampled path that a production-sized corpus takes.

After seeding the scale corpus, verify that `logRunManifest`'s `documents:` line reports **> 50,000**
before drawing conclusions from its results.

### Selecting a corpus

By default, the suite uses `sigevents_postgres_timeout`. To use a different corpus, set
`SEMANTIC_LOG_CORPUS` to its id:

```bash
SEMANTIC_LOG_CORPUS=sigevents_postgres_timeout_scale node scripts/evals run --suite semantic-log-search ...
```

If the id is invalid, the suite fails with the list of registered corpora.

### Adding a new corpus

1. Create `src/corpora/<your_corpus>.ts`, exporting a `CorpusProfile`. Use
   `sigevents_postgres_timeout.ts` as a template.
2. Register it in `src/corpora/index.ts` by adding it to `CORPORA`.
3. Run `node scripts/jest x-pack/solutions/observability/packages/kbn-evals-suite-semantic-log-search`
   to verify that labels are unique, queries are consistent, and `k <= maxPatterns <= 20`.
4. Generate the corpus against a running cluster and run the audit to confirm that every label exists:
   ```bash
   SEMANTIC_LOG_CORPUS=my_corpus node scripts/evals run --suite semantic-log-search --grep "retrieval"
   ```
5. If the audit fails, adjust the labels or the data generator until they match.

The invariant tests in `ground_truth.test.ts` run automatically over all registered corpora, so a
new corpus inherits validation for free.

## Ground truth

Ground truth is a predicate over the raw `message` field, not a set of document ids: the retrieval
strategies return log *patterns*, and the ES|QL `CATEGORIZE` + `RERANK` strategy cannot return
`_id` or `_index` at all.

A label is a case-insensitive substring of a message. Relevance is graded, so a saturation warning
scores below an outright failure, and the headline metrics count failures only
(`relevanceThreshold`).

Two consequences are worth stating plainly:

- **Recall is measured against the labelled set, not against the corpus.** It is comparable between
  arms; it is not an absolute measure of coverage.
- **Labels are applied to each pattern's sample message**, which is one arbitrary representative of
  a group. `Weighted Precision@K` weights each result by how many documents it covers, so a pattern
  covering 40,000 documents does not count the same as one covering 50. Read the caveat under
  [Metrics](#weighted-precision-is-a-diagnostic-not-a-target) before using it for anything.

`src/ground_truth.test.ts` asserts that no label is a substring of another and that nothing is both
relevant and a trap. Those two properties are what keep the metrics meaningful.

## Metrics

All metrics apply to both the `keyword` and `semantic` arms under identical conditions (same corpus,
same `maxPatterns` candidate budget).

| Metric | Direction | Notes |
|---|---|---|
| `Precision@K` | maximize | Divides by K (not by results returned); cannot be inflated by returning fewer patterns |
| `Weighted Precision@K` | diagnostic | Precision weighted by documents covered per pattern. **Do not tune against it** (see below) |
| `Recall` | maximize | Over the labelled set; no K cutoff because one pattern can carry several labels |
| `Hard Negatives@K` | minimize | Lexical traps in the top K |
| `Distinct Relevant Messages@K` | maximize | The metric the parent issue's acceptance criteria use |
| `R-Precision` | maximize | Precision@R where R = number of correct answers; the right metric for literal queries (can reach 1.0) |
| `nDCG@K` | maximize | Normalised DCG using graded relevance (grade 2 > grade 1 > 0) |
| `MRR` | maximize | Reciprocal rank of the first relevant result |
| `Top Relevance Score` | neutral | The reranker's score for the top pattern; calibrates the "nothing relevant" threshold (see below). Scale belongs to the configured endpoint, so it is meaningless across endpoints |
| `Retrieval Latency` | minimize | Wall-clock fetch-to-parsed. Comparable only at equal concurrency, equal allocation count and the same rerank endpoint. Not normalised by candidate count, and candidate *text length* is what the cost actually tracks |
| `Count Sanity` | minimize | Flags counts too high (lifetime counters) or too low (raw sampled `doc_count`). The low side is inert on the semantic arm (see below) |
| `Used Log Tool` | neutral | Agent arms: verifies each arm is configured correctly |
| `Relevant Messages Cited` | maximize | Agent arms: coverage of the answer, not its quality |
| `Input Tokens` / `Output Tokens` / `Latency` / `Tool Calls` | minimize | From `@kbn/evals` trace-based evaluators |

### Weighted Precision is a diagnostic, not a target

It rewards covering log volume, which structurally penalises the behaviour the semantic strategy
exists for. A relevant *rare* pattern contributes almost nothing to the numerator, while a single
irrelevant high-frequency pattern loads the denominator. The keyword arm ranks by frequency and is
therefore flattered by it: in one recorded run the semantic arm won every rank-based metric and
lost this one, 0.39 against 0.66, with a median of 0.21 against a mean of 0.39.

Keep reading it, because "does this surface volume-relevant material" is a real question. Do not
optimise against it: doing so would optimise for frequency, which is what `get_logs` already does.
`Distinct Relevant Messages@K` is the headline, because that is what the acceptance criteria state.

### Count Sanity's low side cannot see the semantic arm

The guard is meant to catch a strategy returning raw sampled `doc_count` instead of counts
normalised back to population scale. It compares the summed pattern counts against `totalCount`,
which works for `get_logs`, where `totalCount` is the documents the query matched. On the semantic
arm `totalCount` is *derived from the returned patterns*, so the comparison becomes
`sum < sum * 0.1` and can never fire.

**Do not "fix" this by comparing against the corpus size.** That was tried and it reports every
narrow question as broken: against a 2,611-document corpus, `message: hikaripool` matched 12
documents whose counts summed to exactly 12, and `message: econnrefused` 100 of 100. Both correct
and complete, both flagged. A narrow filter is supposed to match a small slice of the corpus.

Closing this properly needs the probe total from the service, which it does not report. Until then
the high side (counts exceeding the corpus) works for both arms and the low side covers the keyword
arm only.

### The reranker's scores are not calibrated around zero

In the same run the top logit was **negative on most queries** (mean -1.18, median -0.88, range
-4.12 to 1.07) while `MRR` was **1.00**, meaning the top result was relevant for every single
query. A `score > 0` cutoff for the planned "nothing relevant matched" signal would therefore
reject correct answers. That threshold has to be calibrated against this distribution, including
negative values, rather than assumed to sit at zero.

## Running it

`beforeAll` seeds the corpus automatically when the target index is empty **or** when it contains
data from a different corpus (missing labels). It then audits every label.

If the seed command fails (ES unreachable, synthtrace not built), the run fails with the command
to run manually. If the corpus is present but labels are missing (scenario or seed changed), it
fails with the list of missing labels.

The semantic arm additionally checks that the service can serve requests before running any
experiment. If the service returns warnings and no patterns, the run fails with the service's own
explanation. The `.rerank-v1-elasticsearch` check in `logRunManifest` is provenance, not a gate,
and it records the suite's assumption about Kibana's default, not a read of it. Kibana takes the
endpoint from `xpack.logsDataAccess.semanticLogSearch.rerankInferenceId`, so a Kibana configured
otherwise ranks through an endpoint the manifest never inspected.

**The agent arms need a working model connector; the retrieval arms do not.** The retrieval arms
put no model in the loop, so they pass on a stack where no LLM is reachable. The agent arms call
`converse()`, and if the connector cannot reach its provider all three fail with
`401 Unauthorized ... Missing Authentication header` before scoring anything. The usual cause is
the OpenRouter `.gen-ai` connector still carrying `config.json`'s `openrouter.apiKey` placeholder
of `REPLACE_ME`; run `node scripts/evals init config` to supply the real key. A retrieval pass
alongside an agent failure is therefore expected in that state, not a contradiction. See
[the 401 entry in SETUP.md](./SETUP.md#agent-evals-fail-with-401-unauthorized-or-missing-authentication-header),
which distinguishes this from the unrelated CCM case that produces the same message.

```bash
# Boot the stack and run the suite (--judge is required even for retrieval-only runs)
node scripts/evals start --suite semantic-log-search --project <connector-id> --judge <connector-id>

# Iterate against a running stack
node scripts/evals run --suite semantic-log-search --project <connector-id> --judge <connector-id>

# Only the retrieval arms, which run no model (still requires --judge for config construction)
node scripts/evals run --suite semantic-log-search --grep "retrieval" --project <connector-id> --judge <connector-id>

# Run a specific corpus
SEMANTIC_LOG_CORPUS=sigevents_fraud_check_redis_herring node scripts/evals run --suite semantic-log-search --project <connector-id> --judge <connector-id>

# Run the scale corpus (exercises the two-pass CATEGORIZE path)
SEMANTIC_LOG_CORPUS=sigevents_postgres_timeout_scale node scripts/evals run --suite semantic-log-search --project <connector-id> --judge <connector-id>

# Closure runs: pin repetitions and report spread, not just means
node scripts/evals run --suite semantic-log-search --repetitions 3 --project <connector-id> --judge <connector-id>

# Compare two runs
node scripts/evals compare <execution-id-a> <execution-id-b>
```

**URL override**: the seeding command uses `http://elastic:changeme@localhost:9220` and `:5620` by
default. Override with `ES_URL` and `KIBANA_URL` env vars:

```bash
ES_URL=http://elastic:changeme@localhost:9220 KIBANA_URL=http://elastic:changeme@localhost:5620 \
  node scripts/evals run --suite semantic-log-search ...
```

To seed the corpus manually:

```bash
node scripts/synthtrace sigevents \
  --target=http://elastic:changeme@localhost:9220 \
  --kibana=http://elastic:changeme@localhost:5620 \
  --scenarioOpts="scenario=postgres_timeout,seed=42" \
  --from=now-2h --to=now --clean
```

Unit tests for the ground truth and the metrics:

```bash
node scripts/jest --config x-pack/solutions/observability/packages/kbn-evals-suite-semantic-log-search/jest.config.js
```

## Known gaps

- **The keyword arm's KQL is synthesised** by `toKeywordFilter`, which stands in for what a user
  would type. A different synthesis would move its numbers.
- **Corpus breadth**: 2 distinct profiles (3 total), all from the `claims` mock app. The `sigevents`
  scenario ships 8 mock apps × ~7 incident scenarios, so a broader corpus would strengthen the claim.
- **Tool conflict not measured**: `get_logs_semantic` is registered unconditionally alongside
  `get_logs`. When the agent has both tools available, the routing question is not yet evaluated.
  This is the parent issue's (`observability-dev#6117`) own named open question.
- **Not registered for CI**: the suite is absent from `.buildkite/pipelines/evals/evals.suites.json`,
  so it has no tags, no `ciLabels`, no `slackChannel` and no `defaultModelGroups`. Local runs work,
  because `--suite` rediscovers configs on a cache miss, but nothing runs it on a schedule. Any
  claim that rests on repeated measurement needs this first.

## Where results go

Every run persists full scores to the `.evaluation-scores` data stream in the cluster under test,
with no flag required: one document per (example, evaluator), carrying the evaluator score and
explanation, the task output and its latency, the model, and the git branch and commit SHA.

```bash
# Runs recorded, most recent first
curl -s -u elastic:changeme "http://localhost:9220/.evaluation-scores/_search" \
  -H 'Content-Type: application/json' -d '{"size":0,"aggs":{"runs":{"terms":{"field":"metadata.execution_id","size":20}}}}'
```

Note that it is a **data stream**, so `_cat/indices/*evaluation*` does not list it; the backing
index is hidden. Use `_data_stream` or query `.evaluation-scores` directly. `node scripts/evals
compare <run-a> <run-b>` reads from here, and `node scripts/evals clear-index` resets it.

There is no HTML report. The terminal table is a summary of what this data stream already holds.

`--export-profile` does **not** control this; it configures tracing targets. The agent arms'
token, latency and tool-call evaluators come from trace data, so they need a reachable trace sink,
which is separate from score persistence.
