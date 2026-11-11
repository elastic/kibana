/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Path from 'path';
import type { ToolingLog } from '@kbn/tooling-log';
import type { OrcaTask } from './dataset';
import { harnessPaths, proposerWorktree } from './paths';
import type { RunSummary } from './runner';
import { gateCandidate } from './gate';
import { checkHoldout, holdoutDir } from './holdout';
import { proposeCandidate, SCRATCH_DIR } from './proposer';
import { reviewEdits } from './review';
import {
  collectEdits,
  resetWorkspace,
  treeHash,
  validateEdits,
  workspaceDiff,
  writeEdits,
} from './candidate_workspace';
import type { CodeEdit } from './candidate_workspace';
import { variantOf } from './workers';
import type { Variant, WorkerPool } from './workers';

export interface CampaignOptions {
  rounds: number;
  searchRollouts: number;
  gateRollouts: number;
  searchTasks: OrcaTask[];
  gateTasks: OrcaTask[];
  pool: WorkerPool;
  agentConnectorId: string;
  /** Re-measure the candidate on the search split (prediction check). Off by default. */
  candidateSearch?: boolean;
  /** Debug only: promote every measured candidate, to exercise promotion and lineage. */
  acceptAny?: boolean;
  /**
   * customer0 incidents the campaign's final incumbent must not regress on, measured once after
   * the last round against the incumbent the campaign started from. Empty skips the holdout.
   */
  holdoutTasks: OrcaTask[];
  /** Debug only: run the final holdout even when nothing was promoted. */
  holdoutAlways?: boolean;
  log: ToolingLog;
}

/** The incumbent between campaigns: its edits on top of the workers' commit. */
const incumbentPath = () => Path.join(harnessPaths().lineageDir, 'incumbent.json');

export const loadIncumbent = (pool: WorkerPool): Variant => {
  const path = incumbentPath();
  if (!Fs.existsSync(path)) return variantOf(pool.workers, [], '');
  const { edits, diff } = JSON.parse(Fs.readFileSync(path, 'utf8')) as {
    edits: CodeEdit[];
    diff: string;
  };
  return variantOf(pool.workers, edits, diff);
};

const saveIncumbent = (variant: Variant): void => {
  Fs.writeFileSync(incumbentPath(), JSON.stringify(variant, null, 2));
};

type LedgerEntry = Record<string, unknown>;

/** Mean reward per case, so predictions (case ids) can be checked against a re-measurement. */
const perCaseDeltas = (before: RunSummary, after: RunSummary) => {
  const meanFor = (summary: RunSummary, caseId: string): number | null => {
    const rewards = summary.runs
      .filter((run) => run.caseId === caseId && run.reward !== null)
      .map((run) => run.reward as number);
    return rewards.length ? rewards.reduce((a, b) => a + b, 0) / rewards.length : null;
  };
  return [...new Set(before.runs.map((run) => run.caseId))].map((caseId) => {
    const incumbent = meanFor(before, caseId);
    const candidate = meanFor(after, caseId);
    return {
      caseId,
      incumbent,
      candidate,
      delta: incumbent !== null && candidate !== null ? candidate - incumbent : null,
    };
  });
};

const checkPredictions = (
  predicted: { fixes: string[]; regressions: string[] },
  deltas: ReturnType<typeof perCaseDeltas>
): string => {
  const byCase = new Map(deltas.map((entry) => [entry.caseId, entry.delta]));
  const describe = (ids: string[], want: (delta: number) => boolean) =>
    ids.map((id) => {
      const delta = byCase.get(id);
      return `${id}: ${
        delta === undefined ? 'not in bundle' : delta === null ? 'unscored' : delta.toFixed(2)
      }${delta !== undefined && delta !== null && want(delta) ? ' ✓' : ''}`;
    });
  return [
    `Predicted fixes, re-measured on the search split: ${
      describe(predicted.fixes, (delta) => delta > 0).join('; ') || 'none'
    }.`,
    `Predicted regressions: ${
      describe(predicted.regressions, (delta) => delta < 0).join('; ') || 'none'
    }.`,
  ].join(' ');
};

const measuredFacts = (search: RunSummary, lastFeedback: string): string =>
  [
    '# Measured facts about this harness',
    '',
    `- Search split: mean reward ${search.meanReward.toFixed(3)} over ${
      search.scoredRuns
    } scored of ${search.runs.length} runs; execution success ${search.executionSuccessRate.toFixed(
      2
    )}.`,
    `- Incidents: RCA accuracy ${search.meanRcaAccuracy?.toFixed(2) ?? 'n/a'}, hallucination ${
      search.meanHallucination?.toFixed(2) ?? 'n/a'
    }. Controls: ${search.meanControl?.toFixed(2) ?? 'n/a'}.`,
    `- Cost $${search.totalCostUsd.toFixed(2)} for the split, ${search.meanToolCalls.toFixed(
      1
    )} tool calls per investigation.`,
    '',
    lastFeedback ? `# How your last proposal turned out\n\n${lastFeedback}` : '',
  ].join('\n');

/**
 * Propose → review → validate → gate → promote, repeated, then one holdout.
 *
 * A variant is a set of edits to the editable files, nothing else. The incumbent is stored as its
 * edits; the proposer edits its own worktree; every measurement runs on the worker pool, one
 * variant at a time, from the run cache where it can. A candidate becomes the incumbent only by
 * beating it on held-out incidents.
 */
export const runCampaign = async ({
  rounds,
  searchRollouts,
  gateRollouts,
  searchTasks,
  gateTasks,
  pool,
  agentConnectorId,
  candidateSearch = false,
  acceptAny = false,
  holdoutTasks,
  holdoutAlways = false,
  log,
}: CampaignOptions): Promise<void> => {
  const { runsDir, lineageDir } = harnessPaths();
  Fs.mkdirSync(lineageDir, { recursive: true });
  const ledgerPath = Path.join(lineageDir, 'ledger.json');
  const ledger: LedgerEntry[] = Fs.existsSync(ledgerPath)
    ? (JSON.parse(Fs.readFileSync(ledgerPath, 'utf8')) as LedgerEntry[])
    : [];
  const saveLedger = () => Fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2));

  const proposer = { path: proposerWorktree() };
  const campaignId = new Date()
    .toISOString()
    .replace(/[-:.TZ]/g, '')
    .slice(0, 14);
  const priorRounds = ledger.length;

  let incumbent = loadIncumbent(pool);
  const start = incumbent;
  let lastFeedback = '';
  log.info(
    `[harness-opt] campaign ${campaignId}: ${rounds} round(s), search ${
      searchTasks.length
    } tasks × ${searchRollouts}, gate ${gateTasks.length} tasks × ${gateRollouts}, ${
      pool.workers.length
    } workers, incumbent ${incumbent.hash}${
      incumbent.edits.length ? ` (${incumbent.edits.length} file(s) changed)` : ''
    }`
  );

  for (let roundInCampaign = 0; roundInCampaign < rounds; roundInCampaign++) {
    const round = priorRounds + roundInCampaign;
    const outputDir = Path.join(runsDir, `round-${round}-${Date.now()}`);
    const base = { round, campaignId, parentHash: incumbent.hash };

    const searchRun = await pool.measure({
      label: `round${round}-incumbent-search`,
      variant: incumbent,
      tasks: searchTasks,
      rollouts: searchRollouts,
      outputDir,
    });

    // The proposer starts from the incumbent's files, so accepted edits accumulate.
    await resetWorkspace(proposer);
    writeEdits({ edits: incumbent.edits, worktree: proposer.path });
    // On disk, not from edits: a proposer worktree on another commit would hold other base files.
    const startHash = treeHash(proposer.path);
    if (startHash !== incumbent.hash) {
      throw new Error(
        `proposer worktree (${startHash}) does not start from the incumbent (${incumbent.hash})`
      );
    }

    let proposal;
    try {
      proposal = await proposeCandidate({
        summary: searchRun,
        history: ledger,
        feedback: measuredFacts(searchRun, lastFeedback),
        worktree: proposer.path,
        log,
      });
    } catch (e) {
      log.warning(`[harness-opt] round ${round} proposer failed: ${(e as Error).message}`);
      ledger.push({ ...base, rejected: 'proposer-failed', error: (e as Error).message });
      saveLedger();
      continue;
    }

    const allEdits = await collectEdits(proposer);
    // Only files the incumbent does not already hold count as this round's proposal.
    const codeEdits = allEdits.filter(
      (edit) => incumbent.edits.find((prior) => prior.path === edit.path)?.content !== edit.content
    );
    if (codeEdits.length === 0) {
      log.warning(`[harness-opt] round ${round} produced no file changes`);
      ledger.push({ ...base, rejected: 'no-edits', manifest: proposal.manifest });
      saveLedger();
      lastFeedback = 'Your last round changed no editable file, so nothing was measured.';
      continue;
    }
    const attemptedDiff = await workspaceDiff(proposer);
    const filesChanged = codeEdits.map((edit) => edit.path);

    const review = await reviewEdits({
      diff: attemptedDiff,
      scratchDir: Path.join(proposer.path, SCRATCH_DIR, 'review'),
      log,
    });
    log.info(
      `[harness-opt] review: ${review.verdict}${
        review.reasons.length ? ` (${review.reasons.join('; ')})` : ''
      }`
    );
    if (review.verdict === 'block') {
      ledger.push({
        ...base,
        rejected: 'review',
        failures: review.reasons,
        manifest: proposal.manifest,
        filesChanged,
        diff: attemptedDiff,
      });
      saveLedger();
      lastFeedback = `Your last edit was blocked by the reviewer: ${review.reasons.join(
        '; '
      )}. Propose something that helps any SRE, not this benchmark.`;
      continue;
    }

    const validation = await validateEdits({ workspace: proposer, edits: allEdits, log });
    if (!validation.ok) {
      log.warning(`[harness-opt] edits rejected: ${validation.failures.join(' | ').slice(0, 500)}`);
      ledger.push({
        ...base,
        rejected: 'validation',
        failures: validation.failures.map((failure) => failure.slice(0, 2000)),
        manifest: proposal.manifest,
        filesChanged,
        diff: attemptedDiff,
      });
      saveLedger();
      lastFeedback = `Your last edit (${filesChanged.join(
        ', '
      )}) never reached the gate: ${validation.failures.join(' ').slice(0, 400)}.`;
      continue;
    }

    const candidate = variantOf(pool.workers, allEdits, attemptedDiff);
    // The incumbent first: usually all cached, so the pool switches to the candidate only once.
    const incumbentGate = await pool.measure({
      label: `round${round}-incumbent-gate`,
      variant: incumbent,
      tasks: gateTasks,
      rollouts: gateRollouts,
      outputDir,
    });
    const candidateGate = await pool.measure({
      label: `round${round}-candidate-gate`,
      variant: candidate,
      tasks: gateTasks,
      rollouts: gateRollouts,
      outputDir,
    });
    const gate = gateCandidate({ incumbent: incumbentGate, candidate: candidateGate });

    // Predictions name search cases, so they are checked by re-measuring the search split.
    const candidateSearchRun = candidateSearch
      ? await pool.measure({
          label: `round${round}-candidate-search`,
          variant: candidate,
          tasks: searchTasks,
          rollouts: searchRollouts,
          outputDir,
        })
      : undefined;
    const searchDeltas = candidateSearchRun ? perCaseDeltas(searchRun, candidateSearchRun) : [];
    const predictionCheck = candidateSearchRun
      ? checkPredictions(
          {
            fixes: proposal.manifest.predictedFixes ?? [],
            regressions: proposal.manifest.predictedRegressions ?? [],
          },
          searchDeltas
        )
      : 'The search split was not re-measured.';
    lastFeedback = `${predictionCheck} On the held-out gate the edit moved reward by ${gate.meanDelta.toFixed(
      3
    )} (CI ${gate.ciLow.toFixed(3)}..${gate.ciHigh.toFixed(3)}, ${
      gate.seeds
    } incidents) at ${gate.costRatio.toFixed(2)}× cost and was ${
      gate.accepted ? 'ACCEPTED' : `rejected: ${gate.reasons.join('; ')}`
    }.`;
    log.info(
      `[harness-opt] round ${round}: Δreward ${gate.meanDelta.toFixed(3)} [${gate.ciLow.toFixed(
        3
      )}, ${gate.ciHigh.toFixed(3)}] over ${gate.seeds} incidents, cost ×${gate.costRatio.toFixed(
        2
      )}, execution ${gate.incumbentExecutionSuccess.toFixed(
        2
      )} → ${gate.candidateExecutionSuccess.toFixed(2)} → ${
        gate.accepted ? `ACCEPTED via ${gate.acceptedVia}` : `rejected (${gate.reasons.join('; ')})`
      }`
    );

    const promoted = gate.accepted || acceptAny;
    ledger.push({
      ...base,
      manifest: proposal.manifest,
      review,
      filesChanged,
      diff: attemptedDiff,
      variantHash: candidate.hash,
      telemetryVariant: candidateGate.telemetryVariant,
      agentConnectorId,
      gate,
      promoted: gate.accepted,
      gateDeltas: perCaseDeltas(incumbentGate, candidateGate),
      searchReward: searchRun.meanReward,
      candidateSearchReward: candidateSearchRun?.meanReward,
      searchDeltas,
      predictionCheck,
      outputDir,
      ...(acceptAny ? { forcedPromotion: !gate.accepted } : {}),
    });
    saveLedger();

    if (promoted) {
      if (!gate.accepted) log.warning(`[harness-opt] --accept-any: promoting a rejected candidate`);
      incumbent = candidate;
      saveIncumbent(incumbent);
      const acceptedDir = Path.join(lineageDir, `accepted-${round}-${candidate.hash}`);
      Fs.mkdirSync(acceptedDir, { recursive: true });
      Fs.writeFileSync(Path.join(acceptedDir, 'variant.diff'), attemptedDiff);
      log.info(`[harness-opt] round ${round} promoted to incumbent ${candidate.hash}`);
    }
  }

  // The holdout, once: the campaign's net change against where it started, on real production
  // incidents the proposer never saw. Its runs live outside runs/ and are never fed back.
  if (holdoutTasks.length > 0 && (incumbent.hash !== start.hash || holdoutAlways)) {
    const holdoutOutput = Path.join(holdoutDir(), `campaign-${campaignId}`);
    const startHoldout = await pool.measureHoldout({
      label: 'start-holdout',
      variant: start,
      tasks: holdoutTasks,
      outputDir: holdoutOutput,
    });
    const finalHoldout = await pool.measureHoldout({
      label: 'final-holdout',
      variant: incumbent,
      tasks: holdoutTasks,
      outputDir: holdoutOutput,
    });
    const holdout = checkHoldout({ incumbent: startHoldout, candidate: finalHoldout });
    Fs.writeFileSync(
      Path.join(lineageDir, `holdout-${campaignId}.json`),
      JSON.stringify(
        { campaignId, startHash: start.hash, finalHash: incumbent.hash, ...holdout },
        null,
        2
      )
    );
    log.info(
      `[harness-opt] holdout ${start.hash} → ${incumbent.hash}: ${
        holdout.passed ? 'passed' : "FAILED — do not ship this campaign's incumbent"
      }; Δ ${holdout.meanDelta.toFixed(3)} [${holdout.ciLow.toFixed(3)}, ${holdout.ciHigh.toFixed(
        3
      )}] over ${holdout.incidents} incidents, leaked ${holdout.incumbentLeaked} → ${
        holdout.candidateLeaked
      }${holdout.reasons.length ? ` (${holdout.reasons.join('; ')})` : ''}`
    );
  } else if (holdoutTasks.length > 0) {
    log.info('[harness-opt] nothing was promoted; holdout skipped');
  }
  log.info(`[harness-opt] ledger: ${ledgerPath}`);
};

/** Propose → review → validate against a stored measurement; leaves the edit in the proposer. */
export const dryRound = async ({
  summary,
  pool,
  log,
}: {
  summary: RunSummary;
  pool: WorkerPool;
  log: ToolingLog;
}): Promise<void> => {
  const workspace = { path: proposerWorktree() };
  await resetWorkspace(workspace);
  writeEdits({ edits: loadIncumbent(pool).edits, worktree: workspace.path });
  const proposal = await proposeCandidate({
    summary,
    history: [],
    feedback: measuredFacts(summary, ''),
    worktree: workspace.path,
    log,
  });
  log.info(`[dry-round] manifest: ${JSON.stringify(proposal.manifest, null, 2)}`);
  const edits = await collectEdits(workspace);
  const diff = await workspaceDiff(workspace);
  log.info(`[dry-round] ${edits.length} file(s) changed:\n${diff.slice(0, 4000)}`);
  const review = await reviewEdits({
    diff,
    scratchDir: Path.join(workspace.path, SCRATCH_DIR, 'review'),
    log,
  });
  log.info(`[dry-round] review: ${JSON.stringify(review)}`);
  const validation = await validateEdits({ workspace, edits, log });
  log.info(`[dry-round] validation: ${JSON.stringify(validation).slice(0, 2000)}`);
};
