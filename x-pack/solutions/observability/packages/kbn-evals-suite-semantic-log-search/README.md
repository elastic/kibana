# @kbn/evals-suite-semantic-log-search

Measures whether semantic log search returns better log messages than what ships today, and what
it costs to do so.

Tracked by [elastic/observability-dev#6159](https://github.com/elastic/observability-dev/issues/6159).

## The arms

Every arm answers the same questions over the same corpus. They differ only in what the caller is
allowed to use.

| Arm | What it is | Where |
|---|---|---|
| `keyword` | `get_logs` with a KQL filter built from the question | `evals/retrieval` and `evals/agent` |
| `semantic` | `get_logs` with `semanticFilter` set to the question | `evals/retrieval` and `evals/agent` |
| `baseline` | The default agent, which has no log-specific tool | `evals/agent` only |

`evals/retrieval` executes the tool directly, so the ranking is deterministic and no model is in
the loop. `evals/agent` goes through `converse`, which is where token cost, latency and tool
selection become measurable.

## Corpus profiles

The suite supports multiple corpora. Each corpus is defined in `src/corpora/` as a `CorpusProfile`:

- **Target**: the data stream or index pattern where the corpus lands.
- **Time range**: when the data was generated.
- **Message classes**: categories of log messages, labelled by meaning rather than vocabulary.
- **Queries**: the questions to ask, with graded ground truth and lexical traps.
- **Parameters**: `k`, `relevanceThreshold`, and `maxPatterns` for the metrics.

### Selecting a corpus

By default, the suite uses `sigevents_postgres_timeout`. To use a different corpus, set
`SEMANTIC_LOG_CORPUS` to its id:

```bash
SEMANTIC_LOG_CORPUS=my_corpus node scripts/evals run --suite semantic-log-search ...
```

If the id is invalid, the suite fails with the list of registered corpora.

### Adding a new corpus

1. Create `src/corpora/<your_corpus>.ts`, exporting a `CorpusProfile`. Use
   `sigevents_postgres_timeout.ts` as a template.
2. Register it in `src/corpora/index.ts` by adding it to `CORPORA`.
3. Run `node scripts/jest x-pack/solutions/observability/packages/kbn-evals-suite-semantic-log-search`
   to verify that labels are unique and queries are consistent.
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
  a group. `Weighted Precision@K` exists to counterbalance this: it weights each result by how many
  documents it covers, so a pattern covering 40.000 documents does not count the same as one
  covering 50.

`src/ground_truth.test.ts` asserts that no label is a substring of another and that nothing is both
relevant and a trap. Those two properties are what keep the metrics meaningful.

## Metrics

| Metric | Direction | Notes |
|---|---|---|
| `Precision@K` | maximize | Divides by K, not by the number of results returned |
| `Weighted Precision@K` | maximize | Weighted by documents covered |
| `Recall` | maximize | Over the labelled set |
| `Hard Negatives@K` | minimize | Lexical traps in the top K |
| `Distinct Relevant Messages@K` | maximize | The metric the parent issue's acceptance criteria use |
| `Used Semantic Filter` | maximize | Agent arms: did the model reach for the semantic path |
| `Relevant Messages Cited` | maximize | Agent arms: coverage of the answer, not its quality |
| `Input Tokens` / `Output Tokens` / `Latency` / `Tool Calls` | minimize | From `@kbn/evals` trace-based evaluators |

## Running it

The corpus is a precondition, not something the suite seeds, because the labels are substrings of a
specific synthtrace scenario. Generate it against the cluster the evals are running on:

```bash
node scripts/synthtrace sigevents \
  --target=http://elastic:changeme@localhost:9200 \
  --kibana=http://elastic:changeme@localhost:5620 \
  --scenarioOpts="scenario=postgres_timeout,seed=42" \
  --from=now-2h --to=now --clean
```

`beforeAll` audits the corpus and fails with this command if any label is missing, rather than
letting every metric silently report zero.

Then:

```bash
# Boot the stack and run the suite
node scripts/evals start --suite semantic-log-search --project <connector-id> --judge <connector-id>

# Iterate against a running stack
node scripts/evals run --suite semantic-log-search --project <connector-id> --judge <connector-id>

# Only the deterministic retrieval arms, which need no judge model
node scripts/evals run --suite semantic-log-search --grep "retrieval"

# Compare two runs
node scripts/evals compare <execution-id-a> <execution-id-b>
```

Unit tests for the ground truth and the metrics:

```bash
node scripts/jest --config x-pack/solutions/observability/packages/kbn-evals-suite-semantic-log-search/jest.config.js
```

## Known gaps

- **Seeding is manual.** The corpus should be generated by the suite so runs are self-contained.
- **`get_logs` resolves patterns back to documents with `match_phrase` on the sample message.** That
  is looser than `getCategoryQuery`, so some of what this suite measures is the re-filter rather
  than the ranking.
- **The keyword arm's KQL is synthesised** by `toKeywordFilter`, which stands in for what a user
  would type. A different synthesis would move its numbers.
