/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spawn } from 'child_process';
import Fs from 'fs';
import Os from 'os';
import Path from 'path';
import type { ToolingLog } from '@kbn/tooling-log';
import type { RunSummary, TaskRun } from './runner';
import { EDITABLE_FILES } from './candidate_workspace';

export interface ProposalManifest {
  files: string[];
  rationale: string;
  predictedFixes: string[];
  predictedRegressions: string[];
}

export interface Proposal {
  manifest: ProposalManifest;
}

export const SCRATCH_DIR = '.harness-scratch';

const runCommand = ({
  command,
  args,
  cwd,
  logPath,
  timeoutMs,
}: {
  command: string;
  args: string[];
  cwd: string;
  logPath: string;
  timeoutMs: number;
}): Promise<number> =>
  new Promise((resolve, reject) => {
    const logStream = Fs.createWriteStream(logPath, { flags: 'a' });
    // Own process group: cursor-task forks the agent, and killing only the wrapper on a timeout
    // left the agent editing the candidate worktree while the next stage measured it.
    const child = spawn(command, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'], detached: true });
    const killGroup = () => {
      try {
        if (child.pid) process.kill(-child.pid, 'SIGKILL');
      } catch (e) {
        // already gone
      }
    };
    process.once('exit', killGroup);
    child.stdout.pipe(logStream);
    child.stderr.pipe(logStream);
    const timer = setTimeout(() => {
      killGroup();
      reject(
        new Error(`${Path.basename(command)} timed out after ${timeoutMs}ms (log: ${logPath})`)
      );
    }, timeoutMs);
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      process.removeListener('exit', killGroup);
      // Anything the wrapper left running in its group must not outlive the stage.
      killGroup();
      resolve(code ?? 0);
    });
  });

export const CURSOR_TASK = Path.join(Os.homedir(), '.pi/agent/skills/cursor-subagent/cursor-task');

/** Runs a cursor-task sub-agent in `dir` with `task`, logging to `logPath`. */
export const runSubAgent = async ({
  dir,
  task,
  model,
  logPath,
  timeoutMs,
}: {
  dir: string;
  task: string;
  model?: string;
  logPath: string;
  timeoutMs: number;
}): Promise<number> =>
  runCommand({
    command: process.env.HARNESS_SUBAGENT_CMD ?? CURSOR_TASK,
    args: [dir, ...(model ? ['--model', model] : []), task],
    cwd: dir,
    logPath,
    timeoutMs,
  });

const caseFileName = (run: TaskRun) => `${run.caseId}-r${run.rollout}.json`;

const formatScore = (value: number | null | undefined) =>
  value === null || value === undefined ? '—' : value.toFixed(2);

/**
 * The failures index the proposer starts from: one row per run, worst first, pointing at the full
 * trajectory on disk. An investigation trajectory does not fit in a JSON blob the way an ES|QL
 * query did, so the bundle is a folder the proposer greps and reads as it likes.
 */
export const buildIndex = (summary: RunSummary): string => {
  const rows = [...summary.runs]
    .sort((a, b) => (a.reward ?? -1) - (b.reward ?? -1))
    .map((run) =>
      [
        `\`${run.caseId}\` (r${run.rollout})`,
        run.control ? 'control' : 'incident',
        formatScore(run.reward),
        run.control
          ? `control ${formatScore(run.control_score)}`
          : `acc ${formatScore(run.rcaAccuracy)} / halluc ${formatScore(run.hallucination)}`,
        run.control ? '—' : run.plausibleFlags.join(', '),
        run.namedFlags?.join(', ') || '—',
        run.executionError ? run.executionError.slice(0, 120).replace(/\|/g, '/') : 'ok',
        String(run.toolCalls),
        `$${run.costUsd.toFixed(2)}`,
        `cases/${caseFileName(run)}`,
      ].join(' | ')
    );
  return [
    `# Measured runs: ${summary.label}`,
    '',
    `Mean reward ${summary.meanReward.toFixed(3)} over ${summary.scoredRuns} scored of ${
      summary.runs.length
    } runs. Execution success ${summary.executionSuccessRate.toFixed(
      2
    )}. RCA accuracy ${formatScore(summary.meanRcaAccuracy)}, hallucination ${formatScore(
      summary.meanHallucination
    )}, control ${formatScore(summary.meanControl)}. Cost $${summary.totalCostUsd.toFixed(
      2
    )}, ${summary.meanToolCalls.toFixed(1)} tool calls per run.`,
    '',
    'Worst first. `plausible` is the set of root causes ORCA accepts; `named` is what the',
    'flag-extraction judge read out of the final report. Each row links its full trace.',
    '',
    'case | kind | reward | scores | plausible | named | execution | tool calls | cost | trace',
    '--- | --- | --- | --- | --- | --- | --- | --- | --- | ---',
    ...rows,
    '',
  ].join('\n');
};

const PROPOSER_TASK = ({ editableFiles }: { editableFiles: string }) => `You are improving the
Nightshift investigation agent: an AI SRE that answers "what happened?" by querying a customer's
telemetry from a sandbox. You improve it by editing its prompt and the usage guides it reads, in
this Kibana checkout, the way a Kibana engineer would. It is then measured on incidents you will
never see.

## Start here

\`${SCRATCH_DIR}/\` contains:

- \`index.md\` — every investigation from the latest measurement, worst first: the score, the
  root causes that count as correct (\`plausible\`), the causes its report actually named, whether
  it crashed, and a link to its full trace.
- \`cases/*.json\` — one file per investigation: the question, the final report (summary,
  conclusion, hypotheses), the judge's reading of it, token usage, and the **complete tool-call
  trajectory** — every command the agent ran in the sandbox and what came back. Read several in
  full before deciding anything. This is the only place you can see what the agent actually did.
- \`history.json\` — every previous proposal: files, rationale, verdict, why, reward delta.
- \`history_full.json\` — the same rounds with full diffs and per-incident deltas.
- \`feedback.md\` — how your last proposal turned out.

Find the failure pattern that explains the most runs. One well-aimed change beats three
speculative ones.

## What you may change

Only these files (they are plain text, loaded verbatim):

${editableFiles}

\`investigator.md.text\` is the system prompt. The \`.connector-docs\` guides are copied into the
sandbox at \`/workspace/.connector-docs/\` and the agent reads them before querying a data source.
Keep the \`{{...}}\` placeholders in the prompt exactly as they are. Anything else you edit is
discarded and the round is wasted.

## How you are graded — read this before writing anything

1. **The reward.** Per incident: \`0.7 · rca_accuracy + 0.3 · (1 − hallucination)\`. Accuracy is 1
   only when the report names *every* plausible root cause. Hallucination is 1 when the report
   names causes and none of them is plausible. On no-incident tasks (controls) the reward is 1 when
   the agent does not claim an incident in a quiet period. Crashed, timed-out and truncated runs
   are unscored, not zero.
2. **Held-out incidents.** The score is measured on incidents that are not in \`cases/\`. Those
   files are evidence about failure modes, not the test set. Fixing one case by name buys nothing.
3. **Flag telemetry is hidden.** Every measurement, including the cases in \`cases/\`, runs with
   all feature-flag telemetry removed by document-level security (flag service logs, spans and
   metrics, every \`feature_flag\` field, log lines that name a flag). The agent has to get from
   symptoms to the trigger through the telemetry and the source code, as on a customer cluster.
   Do not teach it to look for feature flags first: there is nothing to find.
4. **An unseen production holdout must not regress.** A candidate that wins the gate is also run on
   real Elastic Cloud incidents whose causes are deploys, config pushes, resource exhaustion,
   networking and long-standing defects — not flag toggles — on different telemetry layouts with
   different service names, and is not promoted if it is worse there. You will never see those
   cases or their scores, only whether the holdout passed. Guidance that only makes sense for an
   OpenTelemetry demo shop will not survive it.
5. **Cost counts.** A candidate that costs more than 1.1× the incumbent must be clearly better; one
   that is significantly cheaper per solved incident at equal quality is also accepted.
6. **Regressions are capped, and giving up is worse.** Improved incidents must outnumber regressed
   ones, and execution success must not drop: a change that makes the agent stop early or answer
   nothing scores worse.

The one-line test: write guidance for an SRE on a cluster you will never see. If a sentence only
makes sense for a demo shop with feature flags, it does not belong in the prompt. Never name the
services, flags, index patterns, time ranges or question wording you see in \`cases/\`.

## What gets your change thrown out

A reviewer reads the diff before anything is measured and blocks only blatant cheating: benchmark
values written into the prompt (flag, service or index names, incident dates, question phrasings);
instructions that detect the evaluation; grader-gaming such as naming every change you saw
regardless of evidence; or removing placeholders and guardrails. Grey-area ideas go to the
measurement, so test the hypothesis you believe in.

## Finish

Run \`git diff --stat\` to confirm you changed only the files above, then write
\`${SCRATCH_DIR}/proposal.json\`:

{
  "manifest": {
    "files": ["<path you changed>"],
    "rationale": "the pattern you found in cases/, and why this edit addresses it, in a paragraph",
    "predictedFixes": ["<case_id from index.md>"],
    "predictedRegressions": ["<case_id>"]
  }
}

Predictions are \`case_id\` values copied from \`index.md\`; they are checked against a
re-measurement of the same cases. Predict the few you actually reasoned about.`;

const describeEditableFiles = (worktree: string, history: unknown[]): string => {
  const touched = new Set(
    (history as Array<{ filesChanged?: string[] }>).flatMap((entry) => entry.filesChanged ?? [])
  );
  return EDITABLE_FILES.map((file) => {
    const absolute = Path.join(worktree, file);
    const lines = Fs.existsSync(absolute)
      ? Fs.readFileSync(absolute, 'utf8').split('\n').length
      : 0;
    return `- \`${file}\` (${lines} lines)${touched.has(file) ? '' : ' [never edited so far]'}`;
  }).join('\n');
};

export const writeBundle = ({
  summary,
  history,
  feedback,
  scratchDir,
}: {
  summary: RunSummary;
  history: unknown[];
  feedback: string;
  scratchDir: string;
}): void => {
  Fs.rmSync(scratchDir, { recursive: true, force: true });
  const casesDir = Path.join(scratchDir, 'cases');
  Fs.mkdirSync(casesDir, { recursive: true });
  for (const run of summary.runs) {
    if (Fs.existsSync(run.tracePath)) {
      Fs.copyFileSync(run.tracePath, Path.join(casesDir, caseFileName(run)));
    }
  }
  Fs.writeFileSync(Path.join(scratchDir, 'index.md'), buildIndex(summary));
  const digest = (history as Array<Record<string, unknown>>).map((entry) => {
    const gate = (entry.gate ?? {}) as Record<string, unknown>;
    return {
      round: entry.round,
      filesChanged: entry.filesChanged,
      rationale: ((entry.manifest ?? {}) as { rationale?: string }).rationale,
      outcome: entry.rejected
        ? `rejected before measurement (${entry.rejected})`
        : entry.promoted ?? gate.accepted
        ? 'ACCEPTED'
        : gate.accepted
        ? 'won the gate, failed the unseen production holdout'
        : 'rejected at the gate',
      why: entry.rejected
        ? ((entry.failures as string[]) ?? []).join(' ').slice(0, 400)
        : ((gate.reasons as string[]) ?? []).join('; '),
      deltaReward: gate.meanDelta,
      costRatio: gate.costRatio,
    };
  });
  Fs.writeFileSync(Path.join(scratchDir, 'history.json'), JSON.stringify(digest, null, 2));
  // The holdout is unseen: the proposer learns whether it passed, nothing about its incidents.
  const fullHistory = (history as Array<Record<string, unknown>>).map(({ holdout, ...entry }) =>
    holdout ? { ...entry, holdoutPassed: (holdout as { passed?: boolean }).passed } : entry
  );
  Fs.writeFileSync(
    Path.join(scratchDir, 'history_full.json'),
    JSON.stringify(fullHistory, null, 2)
  );
  Fs.writeFileSync(Path.join(scratchDir, 'feedback.md'), feedback);
};

export const proposeCandidate = async ({
  summary,
  history,
  feedback,
  worktree,
  log,
  model = process.env.HARNESS_PROPOSER_MODEL ?? 'grok-4.7-high',
  timeoutMs = Number(process.env.HARNESS_PROPOSER_TIMEOUT_MS ?? 1_200_000),
}: {
  summary: RunSummary;
  history: unknown[];
  feedback: string;
  /** The candidate worktree: the proposer edits it in place. */
  worktree: string;
  log: ToolingLog;
  model?: string;
  timeoutMs?: number;
}): Promise<Proposal> => {
  const scratchDir = Path.join(worktree, SCRATCH_DIR);
  writeBundle({ summary, history, feedback, scratchDir });
  log.info(`[harness-opt] bundle written with ${summary.runs.length} case trace(s)`);

  const logPath = Path.join(scratchDir, 'proposer.log');
  log.info(`[harness-opt] proposing with ${model}; log: ${logPath}`);
  try {
    const code = await runSubAgent({
      dir: worktree,
      model,
      task: PROPOSER_TASK({ editableFiles: describeEditableFiles(worktree, history) }),
      logPath,
      timeoutMs,
    });
    if (code !== 0) log.warning(`[harness-opt] proposer exited with code ${code}; see ${logPath}`);
  } catch (e) {
    log.warning(`[harness-opt] proposer failed: ${(e as Error).message}`);
  }

  const proposalPath = Path.join(scratchDir, 'proposal.json');
  if (!Fs.existsSync(proposalPath)) {
    throw new Error(`proposer did not write ${SCRATCH_DIR}/proposal.json (log: ${logPath})`);
  }
  const proposal = JSON.parse(Fs.readFileSync(proposalPath, 'utf8')) as Proposal;
  if (!proposal.manifest) throw new Error('proposal.json is missing "manifest"');
  return proposal;
};
