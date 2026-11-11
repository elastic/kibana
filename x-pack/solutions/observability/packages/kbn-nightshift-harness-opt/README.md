# @kbn/nightshift-harness-opt

Experimental, dev-only optimization loop for the Nightshift investigation agent
(`elastic/nightshift-program#2298`), ported from `@kbn/esql-harness-opt` (elastic/kibana#304088).

A **harness variant is a set of file edits**, no config layer. The first editable surface is
text only:

- `server/agents/investigation/instructions/investigator.md.text` — the investigator prompt
- `server/tools/sandbox_bash/connector_docs/*.md.text` — the guides seeded into
  `/workspace/.connector-docs/` in the sandbox

## Reward

Per ORCA task, from the eval suite's own ORCA judges (one flag-extraction call per report; set
logic in code):

```
incident: 0.7 · orca_rca_accuracy + 0.3 · (1 − orca_hallucination)
control:  orca_control
```

Crashed, timed-out and truncated runs are unscored (null), as ORCA does; `execution_success` is
tracked separately and guarded at the gate.

## Data and splits

`nightshift/orca-bench-public755-v2` (downloaded once into `~/.nightshift-harness/datasets`).
Splits are by **incident** (`metadata.orca_incident`), ranked by a salted hash: search 14 / gate
13 / sealed 9 incidents. Small subsets (`--search-limit`, `--gate-limit`) pick at most one task
per incident, from the largest telemetry-cutoff groups first (tasks of one cutoff run in
parallel, cutoffs run one after another), alternating difficulty inside a group.

Every run reads ORCA through the suite's per-cutoff document-level-security keys
(`mintOrcaCutoffKeys`), so no query can see past the task's snapshot.

## Two lanes

| lane | worktree | ES / Kibana | role |
|---|---|---|---|
| incumbent | this checkout | `:9210` / `:5611` (dev_stack index 1) | current best variant |
| candidate | `~/kibana-nshopt-cand` | `:9220` / `:5621` (dev_stack index 2) | proposal under test |

Each lane has its own Elasticsearch: the investigator's ORCA connector is per space and its key is
swapped per cutoff, so a shared cluster would race. Lanes start with `~/.nightshift-harness/lane.kibana.yml`
loaded after `kibana.dev.yml` (`DEV_STACK_EXTRA_KIBANA_CONFIG`): Wiki, Memory, decision trees and
learning off, online evals paused, Task Manager capacity 21, and the suite's sandbox key.
`prepare` binds the service accounts, turns quotas off, sets the ORCA custom context and allows
GitHub on the space's sandbox egress allowlist.

## Loop

1. Measure the incumbent on the search split (reused while the incumbent is unchanged).
2. Write the bundle into `<candidate>/.harness-scratch/`: `index.md` (worst first), `cases/*.json`
   (question, report, judge reading, usage, full tool-call trajectory), history, feedback.
3. Proposer (cursor `grok-4.7-high`) edits the candidate worktree and writes `proposal.json`. The
   task prompt states the grading contract (held-out incidents, no-flags tier, unseen customer
   corpus, cost, regressions).
4. Reviewer (cursor) blocks benchmark encoding, flag privileging, grader gaming.
5. Lint (paths, placeholders) + jest on the agent and sandbox tool folders.
6. Restart the candidate lane; both lanes run the gate split in parallel.
7. Paired bootstrap over incidents; quality or cost path, regression cap, execution guard.
8. Re-measure the candidate on search to check the proposal's predictions.
9. Promote: write the edits into the incumbent worktree and restart it.

## Commands

```bash
node scripts/nightshift_harness_opt.js splits --split search --limit 4
node scripts/nightshift_harness_opt.js prepare --lane incumbent
node scripts/nightshift_harness_opt.js restart --lane candidate
node scripts/nightshift_harness_opt.js run --lane incumbent --split search --limit 4
node scripts/nightshift_harness_opt.js dry-round --from ~/.nightshift-harness/runs/<dir>/<label>.json
node scripts/nightshift_harness_opt.js rescore --from ~/.nightshift-harness/runs
node scripts/nightshift_harness_opt.js campaign --rounds 3 --search-limit 8 --gate-limit 8 --gate-rollouts 1
node scripts/nightshift_harness_opt.js report --serve --port 7712
```

`--accept-any` force-promotes every measured candidate (debugging promotion only).

## Known limitations

- Single tier: one model, `no-flags` telemetry (the default since flag telemetry turned every run into a flag lookup; `--telemetry full` restores it). The customer0 canary from the
  issue is not wired into the gate yet.
- Small subsets saturate: on 4 tasks the incumbent already scores 1.0, leaving nothing to search.
- **Run-to-run noise dominates at one rollout.** The unchanged incumbent gave different rewards on
  6 of 10 cases it ran more than once (per-case sd ≈ 0.19, mostly 0.3 ↔ 1.0 flips on multi-flag
  tasks). An 8-incident, 1-rollout gate has a CI of about ±0.4; resolving a +0.1 effect needs on
  the order of 10 rollouts per gate incident. Rollouts of one cutoff run in parallel, so more
  rollouts cost money more than wall clock.
- The reviewer blocked 2 of 3 proposals in the first 3-round campaign for the same idea: "name
  every independent failure you measured as a cause". ORCA's multi-flag answer sets reward exactly
  that, so the line between better multi-cause RCA and padding the cause list is a policy choice.
- The proposer runs with write access to the candidate worktree. Local only, never in CI.
