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
import type { Lane, LaneSettings } from './paths';
import { harnessPaths, laneAuth, restartCommandFor } from './paths';
import { prepareLane } from './kibana';
import { runVariant } from './runner';
import type { RunSummary, TelemetryVariant } from './runner';
import { gateCandidate } from './gate';
import { proposeCandidate, SCRATCH_DIR } from './proposer';
import { reviewEdits } from './review';
import {
  collectEdits,
  resetWorkspace,
  restartLane,
  treeHash,
  validateEdits,
  workspaceDiff,
  writeEdits,
} from './candidate_workspace';
import type { CodeEdit } from './candidate_workspace';

export interface CampaignOptions {
  rounds: number;
  searchRollouts: number;
  gateRollouts: number;
  concurrency: number;
  searchTasks: OrcaTask[];
  gateTasks: OrcaTask[];
  lanes: Record<Lane, LaneSettings>;
  agentConnectorId: string;
  judgeConnectorId: string;
  telemetryVariant: TelemetryVariant;
  /** Skip re-measuring the candidate on the search split (prediction check), to save a run. */
  skipCandidateSearch?: boolean;
  /**
   * Re-measure the incumbent on the search split every round, even when it has not changed since
   * the last measurement. Off by default: an unchanged incumbent's search run is reused.
   */
  freshSearch?: boolean;
  /** Debug only: promote every measured candidate, to exercise promotion and lineage. */
  acceptAny?: boolean;
  log: ToolingLog;
}

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
 * Propose → review → validate → gate → promote, repeated.
 *
 * A variant is a set of edits to the editable files, nothing else. The incumbent runs from its
 * worktree, the candidate from a second one with its own Elasticsearch and Kibana; a candidate
 * becomes the incumbent only by beating it on held-out incidents.
 */
export const runCampaign = async ({
  rounds,
  searchRollouts,
  gateRollouts,
  concurrency,
  searchTasks,
  gateTasks,
  lanes,
  agentConnectorId,
  judgeConnectorId,
  telemetryVariant,
  skipCandidateSearch = false,
  acceptAny = false,
  freshSearch = false,
  log,
}: CampaignOptions): Promise<void> => {
  const { runsDir, lineageDir } = harnessPaths();
  Fs.mkdirSync(lineageDir, { recursive: true });
  const ledgerPath = Path.join(lineageDir, 'ledger.json');
  const ledger: LedgerEntry[] = Fs.existsSync(ledgerPath)
    ? (JSON.parse(Fs.readFileSync(ledgerPath, 'utf8')) as LedgerEntry[])
    : [];
  const saveLedger = () => Fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2));

  const { incumbent, candidate } = lanes;
  const candidateWorkspace = { path: candidate.worktree };
  const campaignId = new Date()
    .toISOString()
    .replace(/[-:.TZ]/g, '')
    .slice(0, 14);
  const priorRounds = ledger.length;

  // Continue from whatever the incumbent worktree already is: accepted variants of an earlier
  // campaign live there, and relabelling them as "base" would re-explore ground already won.
  let incumbentEdits: CodeEdit[] = await collectEdits({ path: incumbent.worktree });
  let incumbentDiff = await workspaceDiff({ path: incumbent.worktree });
  let lastFeedback = '';
  let lastSearch: RunSummary | undefined;

  const common = {
    concurrency,
    agentConnectorId,
    judgeConnectorId,
    telemetryVariant,
    log,
  };
  log.info(
    `[harness-opt] campaign ${campaignId}: ${rounds} round(s), search ${
      searchTasks.length
    } tasks × ${searchRollouts}, gate ${
      gateTasks.length
    } tasks × ${gateRollouts}, incumbent ${treeHash(incumbent.worktree)}${
      incumbentEdits.length ? ` (${incumbentEdits.length} file(s) already changed)` : ''
    }`
  );

  // The incumbent lane must be running the files on disk. Restart it once up front rather than
  // trusting however it was left; a stale process measures a different variant.
  if (
    !(await restartLane({
      command: restartCommandFor(incumbent),
      url: incumbent.kibanaUrl,
      auth: laneAuth(incumbent),
      log,
    }))
  ) {
    throw new Error('incumbent lane did not restart');
  }
  await prepareLane({ lane: incumbent, agentConnectorId, log });

  for (let roundInCampaign = 0; roundInCampaign < rounds; roundInCampaign++) {
    const round = priorRounds + roundInCampaign;
    const outputDir = Path.join(runsDir, `round-${round}-${Date.now()}`);
    const incumbentVariant = { hash: treeHash(incumbent.worktree), diff: incumbentDiff };
    const base = { round, campaignId, parentHash: incumbentVariant.hash };

    const searchRun =
      !freshSearch && lastSearch?.configHash === incumbentVariant.hash
        ? lastSearch
        : await runVariant({
            ...common,
            label: `round${round}-incumbent-search`,
            variant: incumbentVariant,
            lane: incumbent,
            tasks: searchTasks,
            rollouts: searchRollouts,
            outputDir,
          });
    if (searchRun === lastSearch) {
      log.info(`[harness-opt] round ${round}: incumbent unchanged, reusing ${searchRun.label}`);
    }
    lastSearch = searchRun;

    // The candidate always starts from the incumbent's files, so accepted edits accumulate.
    await resetWorkspace(candidateWorkspace);
    writeEdits({ edits: incumbentEdits, worktree: candidate.worktree });
    const startHash = treeHash(candidate.worktree);
    if (startHash !== incumbentVariant.hash) {
      throw new Error(
        `candidate worktree (${startHash}) does not start from the incumbent (${incumbentVariant.hash})`
      );
    }

    let proposal;
    try {
      proposal = await proposeCandidate({
        summary: searchRun,
        history: ledger,
        feedback: measuredFacts(searchRun, lastFeedback),
        worktree: candidate.worktree,
        log,
      });
    } catch (e) {
      log.warning(`[harness-opt] round ${round} proposer failed: ${(e as Error).message}`);
      ledger.push({ ...base, rejected: 'proposer-failed', error: (e as Error).message });
      saveLedger();
      continue;
    }

    const allEdits = await collectEdits(candidateWorkspace);
    // Only files the incumbent does not already hold count as this round's proposal.
    const codeEdits = allEdits.filter(
      (edit) => incumbentEdits.find((prior) => prior.path === edit.path)?.content !== edit.content
    );
    if (codeEdits.length === 0) {
      log.warning(`[harness-opt] round ${round} produced no file changes`);
      ledger.push({ ...base, rejected: 'no-edits', manifest: proposal.manifest });
      saveLedger();
      lastFeedback = 'Your last round changed no editable file, so nothing was measured.';
      continue;
    }
    const attemptedDiff = await workspaceDiff(candidateWorkspace);
    const filesChanged = codeEdits.map((edit) => edit.path);

    const review = await reviewEdits({
      diff: attemptedDiff,
      scratchDir: Path.join(candidate.worktree, SCRATCH_DIR, 'review'),
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

    const validation = await validateEdits({
      workspace: candidateWorkspace,
      edits: allEdits,
      log,
    });
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

    const candidateVariant = { hash: treeHash(candidate.worktree), diff: attemptedDiff };
    if (
      !(await restartLane({
        command: restartCommandFor(candidate),
        url: candidate.kibanaUrl,
        auth: laneAuth(candidate),
        log,
      }))
    ) {
      ledger.push({ ...base, rejected: 'candidate-restart-failed', manifest: proposal.manifest });
      saveLedger();
      continue;
    }
    await prepareLane({ lane: candidate, agentConnectorId, log });

    // Both lanes measure the gate split at the same time, so time-of-day effects (EIS load,
    // sandbox pool) hit both sides alike.
    const [incumbentGate, candidateGate] = await Promise.all([
      runVariant({
        ...common,
        label: `round${round}-incumbent-gate`,
        variant: incumbentVariant,
        lane: incumbent,
        tasks: gateTasks,
        rollouts: gateRollouts,
        outputDir,
      }),
      runVariant({
        ...common,
        label: `round${round}-candidate-gate`,
        variant: candidateVariant,
        lane: candidate,
        tasks: gateTasks,
        rollouts: gateRollouts,
        outputDir,
      }),
    ]);
    const gate = gateCandidate({ incumbent: incumbentGate, candidate: candidateGate });

    // Predictions name search cases, so they are checked by re-measuring the search split.
    const candidateSearch = skipCandidateSearch
      ? undefined
      : await runVariant({
          ...common,
          label: `round${round}-candidate-search`,
          variant: candidateVariant,
          lane: candidate,
          tasks: searchTasks,
          rollouts: searchRollouts,
          outputDir,
        });
    const searchDeltas = candidateSearch ? perCaseDeltas(searchRun, candidateSearch) : [];
    const predictionCheck = candidateSearch
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

    ledger.push({
      ...base,
      manifest: proposal.manifest,
      review,
      filesChanged,
      diff: attemptedDiff,
      variantHash: candidateVariant.hash,
      telemetryVariant,
      agentConnectorId,
      gate,
      gateDeltas: perCaseDeltas(incumbentGate, candidateGate),
      searchReward: searchRun.meanReward,
      candidateSearchReward: candidateSearch?.meanReward,
      searchDeltas,
      predictionCheck,
      outputDir,
      ...(acceptAny ? { forcedPromotion: !gate.accepted } : {}),
    });
    saveLedger();

    if (gate.accepted || acceptAny) {
      if (!gate.accepted) log.warning(`[harness-opt] --accept-any: promoting a rejected candidate`);
      incumbentEdits = allEdits;
      incumbentDiff = attemptedDiff;
      const acceptedDir = Path.join(lineageDir, `accepted-${round}-${candidateVariant.hash}`);
      Fs.mkdirSync(acceptedDir, { recursive: true });
      Fs.writeFileSync(Path.join(acceptedDir, 'variant.diff'), attemptedDiff);
      writeEdits({ edits: allEdits, worktree: incumbent.worktree });
      if (
        !(await restartLane({
          command: restartCommandFor(incumbent),
          url: incumbent.kibanaUrl,
          auth: laneAuth(incumbent),
          log,
        }))
      ) {
        throw new Error('incumbent lane did not restart after promotion');
      }
      await prepareLane({ lane: incumbent, agentConnectorId, log });
      log.info(`[harness-opt] round ${round} promoted to incumbent`);
    }
  }
  log.info(`[harness-opt] ledger: ${ledgerPath}`);
};

/** Propose → review → validate against a stored measurement; leaves the edit in the candidate. */
export const dryRound = async ({
  summary,
  lanes,
  log,
}: {
  summary: RunSummary;
  lanes: Record<Lane, LaneSettings>;
  log: ToolingLog;
}): Promise<void> => {
  const { incumbent, candidate } = lanes;
  const workspace = { path: candidate.worktree };
  await resetWorkspace(workspace);
  writeEdits({
    edits: await collectEdits({ path: incumbent.worktree }),
    worktree: candidate.worktree,
  });
  const proposal = await proposeCandidate({
    summary,
    history: [],
    feedback: measuredFacts(summary, ''),
    worktree: candidate.worktree,
    log,
  });
  log.info(`[dry-round] manifest: ${JSON.stringify(proposal.manifest, null, 2)}`);
  const edits = await collectEdits(workspace);
  const diff = await workspaceDiff(workspace);
  log.info(`[dry-round] ${edits.length} file(s) changed:\n${diff.slice(0, 4000)}`);
  const review = await reviewEdits({
    diff,
    scratchDir: Path.join(candidate.worktree, SCRATCH_DIR, 'review'),
    log,
  });
  log.info(`[dry-round] review: ${JSON.stringify(review)}`);
  const validation = await validateEdits({ workspace, edits, log });
  log.info(`[dry-round] validation: ${JSON.stringify(validation).slice(0, 2000)}`);
};
