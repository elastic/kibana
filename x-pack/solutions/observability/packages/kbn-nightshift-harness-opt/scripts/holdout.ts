/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Path from 'path';
import type { ToolingLog } from '@kbn/tooling-log';
import { createRestClient } from '@kbn/inference-plugin/common';
import {
  runInvestigation,
  waitForInvestigationToEnd,
} from '@kbn/evals-suite-nightshift-investigations/evals/investigation/task';
import type { InvestigationTaskOutput } from '@kbn/evals-suite-nightshift-investigations/evals/investigation/types';
import {
  createAntiLeakageEvaluator,
  createCauseCompletenessEvaluator,
  createGoalPassEvaluator,
} from '@kbn/evals-suite-nightshift-investigations/evals/investigation/judges';
import type { OrcaTask } from './dataset';
import type { LaneSettings } from './paths';
import { harnessPaths } from './paths';
import { createLaneFetch, createLaneKbnClient, applyCustomer0Space } from './kibana';
import { costUsd } from './pricing';
import { readCustomer0Telemetry } from './secrets';
import { judgeConnector, withLane } from './runner';
import type { RunSummary, TaskRun } from './runner';
import { gateCandidate } from './gate';
import { countSandboxErrors } from './cache';

const SETTLE_MS = 2 * 60_000;

/** Holdout runs live outside `runs/`, which the proposer's bundle is built from. */
export const holdoutDir = (): string => Path.join(harnessPaths().root, 'holdout');

const asScore = (value: unknown): number | null => (typeof value === 'number' ? value : null);

/**
 * `0.5 · goal_pass + 0.5 · cause_completeness`, both against the incident's reference answer.
 * Unscored when the investigation produced no answer. Leakage is guarded separately
 * (`checkHoldout`): zeroing the reward on it made one judge call swing an incident from 1 to 0,
 * and the judge also flags evidence that merely postdates the alert, such as today's \`main\`.
 */
export const holdoutReward = ({
  goalPass,
  causeCompleteness,
}: {
  goalPass: number | null;
  causeCompleteness: number | null;
}): number | null => {
  if (goalPass === null || causeCompleteness === null) return null;
  return 0.5 * goalPass + 0.5 * causeCompleteness;
};

/**
 * Runs customer0 holdout tasks on one lane, already running the variant under test, and scores
 * them. Leaves the customer0 context and connector on the lane: the next ORCA run resets them.
 */
export const runHoldoutWorkOnLane = ({
  label,
  lane,
  work,
  concurrency = 16,
  agentConnectorId,
  judgeConnectorId,
  traceDir,
  log,
}: {
  label: string;
  lane: LaneSettings;
  /** Incidents with their attempt number (stored as the run's rollout). */
  work: Array<{ task: OrcaTask; rollout: number }>;
  concurrency?: number;
  agentConnectorId: string;
  judgeConnectorId: string;
  traceDir: string;
  log: ToolingLog;
}): Promise<TaskRun[]> =>
  withLane(lane, async () => {
    const fetch = createLaneFetch(lane);
    Fs.mkdirSync(traceDir, { recursive: true, mode: 0o700 });
    log.info(`[${label}] ${lane.lane}: ${work.length} customer0 runs`);
    if (work.length === 0) return [];
    await applyCustomer0Space({
      fetch,
      kbnClient: createLaneKbnClient(lane, log),
      telemetry: readCustomer0Telemetry(),
    });

    const deps = {
      inferenceClient: createRestClient({ fetch, bindTo: { connectorId: judgeConnectorId } }),
      evaluationConnector: judgeConnector(judgeConnectorId),
      log,
    };
    const evaluators = [
      createGoalPassEvaluator(deps),
      createCauseCompletenessEvaluator(deps),
      createAntiLeakageEvaluator(deps),
    ];

    // A plain pool: customer0 has no telemetry cutoff to group by.
    const outputs: Array<{ task: OrcaTask; rollout: number; output: InvestigationTaskOutput }> = [];
    const queue = [...work];
    await Promise.all(
      Array.from({ length: Math.min(concurrency, work.length) }, async () => {
        for (let item = queue.shift(); item; item = queue.shift()) {
          const { task, rollout } = item;
          const output = await runInvestigation(fetch, task.example, { id: agentConnectorId });
          if (
            output.investigation_id &&
            !(await waitForInvestigationToEnd(fetch, output.investigation_id, SETTLE_MS))
          ) {
            throw new Error(`Investigation ${output.investigation_id} outlived its timeout`);
          }
          outputs.push({ task, rollout, output });
        }
      })
    );

    const runs = await Promise.all(
      outputs.map(async ({ task, rollout, output }): Promise<TaskRun> => {
        const { example } = task;
        const [goal, cause, leakage] = await Promise.all(
          evaluators.map(async (evaluator) => {
            try {
              return await evaluator.evaluate({
                input: example.input,
                output,
                expected: example.output,
                metadata: example.metadata,
              });
            } catch (error) {
              log.warning(`[${label}] ${evaluator.name} failed on ${task.caseId}: ${error}`);
              return { score: null, label: 'judge-error', explanation: String(error) };
            }
          })
        );
        const judgeError = [goal, cause, leakage].some((result) => result.label === 'judge-error');
        const goalPass = asScore(goal.score);
        const causeCompleteness = asScore(cause.score);
        const leaked = asScore(leakage.score) === 0;
        const reward = holdoutReward({ goalPass, causeCompleteness });
        const usage = output.usage;
        const tracePath = Path.join(traceDir, `${task.caseId}-a${rollout}.json`);
        Fs.writeFileSync(
          tracePath,
          JSON.stringify(
            {
              case_id: task.caseId,
              question: example.input.question,
              reference_answer: (example.output as { reference_answer?: string }).reference_answer,
              scores: {
                reward,
                goal_pass: goalPass,
                rca_cause_completeness: causeCompleteness,
                rca_anti_leakage: asScore(leakage.score),
              },
              judge_explanations: {
                goal_pass: goal.explanation,
                rca_cause_completeness: cause.explanation,
                rca_anti_leakage: leakage.explanation,
              },
              execution_error: output.execution_error,
              report: output.structured_report,
              usage,
              tool_call_count: output.tool_call_count,
              tool_call_trajectory: output.tool_call_trajectory,
            },
            null,
            2
          ),
          { mode: 0o600 }
        );
        const run: TaskRun = {
          exampleId: task.id,
          caseId: task.caseId,
          seedId: task.incident,
          control: false,
          tier: task.tier,
          rollout,
          question: example.input.question,
          plausibleFlags: [],
          // goal_pass in the accuracy slot and leakage in the hallucination slot, so the shared
          // summary reports both.
          rcaAccuracy: goalPass,
          hallucination: leaked ? 1 : 0,
          leaked,
          control_score: null,
          reward,
          executionSuccess: !output.execution_error,
          executionError: output.execution_error,
          investigationId: output.investigation_id,
          conclusion: output.structured_report?.conclusion,
          toolCalls: output.tool_call_count ?? 0,
          inputTokens: usage?.input_tokens ?? 0,
          cachedInputTokens: usage?.cached_input_tokens ?? 0,
          outputTokens: usage?.output_tokens ?? 0,
          llmCalls: usage?.llm_calls ?? 0,
          latencyMs: usage?.latency_ms ?? 0,
          costUsd: costUsd({
            connectorId: agentConnectorId,
            inputTokens: usage?.input_tokens,
            cachedInputTokens: usage?.cached_input_tokens,
            outputTokens: usage?.output_tokens,
          }),
          judgeError,
          sandboxErrors: countSandboxErrors(
            output.tool_call_trajectory as Array<{ result?: string }> | undefined
          ),
          tracePath,
        };
        log.info(
          `[${label}] ${task.caseId}: reward ${reward?.toFixed(2) ?? 'unscored'} (goal ${
            goalPass?.toFixed(2) ?? '-'
          }, cause ${causeCompleteness?.toFixed(2) ?? '-'}${leaked ? ', LEAKED' : ''})${
            output.execution_error ? ` error: ${output.execution_error.slice(0, 160)}` : ''
          }, ${run.toolCalls} tool calls, $${run.costUsd.toFixed(3)}`
        );
        return run;
      })
    );
    return runs;
  });

/** Two-sided coverage of the holdout's interval: its low end must stay above `-margin`. */
const HOLDOUT_CONFIDENCE = 0.8;

export interface HoldoutResult {
  passed: boolean;
  incidents: number;
  meanDelta: number;
  ciLow: number;
  ciHigh: number;
  incumbentReward: number;
  candidateReward: number;
  /** goal_pass alone, paired the same way: the part of the reward that moves on Haiku. */
  goalDelta: number;
  goalCiLow: number;
  goalCiHigh: number;
  incumbentGoal: number | null;
  candidateGoal: number | null;
  /** Scored runs per side, after leaked attempts were dropped. */
  incumbentRuns: number;
  candidateRuns: number;
  incumbentExecutionSuccess: number;
  candidateExecutionSuccess: number;
  /** Attempts dropped (and replaced) because they read post-incident evidence. */
  incumbentLeaked: number;
  candidateLeaked: number;
  reasons: string[];
}

/** The same runs, scored by goal_pass instead of the holdout reward. */
const byGoal = (summary: RunSummary): RunSummary => ({
  ...summary,
  runs: summary.runs.map((run) => ({ ...run, reward: run.rcaAccuracy })),
});

/**
 * Non-inferiority on the holdout: the gate already showed the candidate is better on ORCA, so here
 * it only must not be clearly worse. Paired bootstrap over incidents (all counted rollouts of an
 * incident averaged); fails when the CI's low end is below `-margin`, or when more than one extra
 * incident's worth of runs ends without an answer. Leaked attempts do not count either way: they
 * say the retrospective setup let post-incident evidence in, not that the agent is worse.
 */
export const checkHoldout = ({
  incumbent,
  candidate,
  margin = 0.1,
}: {
  incumbent: RunSummary;
  candidate: RunSummary;
  margin?: number;
}): HoldoutResult => {
  const leaked = ({ runs }: RunSummary) => runs.filter((r) => r.leaked).length;
  const counted = ({ runs }: RunSummary) => runs.filter((r) => r.reward !== null).length;
  // Pinned, not the gate's default: loosening the gate must not loosen the production backstop.
  const paired = gateCandidate({ incumbent, candidate, confidence: HOLDOUT_CONFIDENCE });
  const goal = gateCandidate({
    incumbent: byGoal(incumbent),
    candidate: byGoal(candidate),
    confidence: HOLDOUT_CONFIDENCE,
  });
  const incidents = paired.seeds || 1;
  const reasons: string[] = [];
  if (paired.seeds === 0) reasons.push('no holdout incident was scored on both lanes');
  if (paired.ciLow < -margin) {
    reasons.push(
      `holdout reward Δ ${paired.meanDelta.toFixed(3)}, CI low ${paired.ciLow.toFixed(
        3
      )} below −${margin}`
    );
  }
  const executionDrop = incumbent.executionSuccessRate - candidate.executionSuccessRate;
  if (executionDrop > 1 / incidents + 1e-9) {
    reasons.push(
      `holdout execution success fell from ${incumbent.executionSuccessRate.toFixed(
        2
      )} to ${candidate.executionSuccessRate.toFixed(2)}`
    );
  }
  return {
    passed: reasons.length === 0,
    incidents: paired.seeds,
    meanDelta: paired.meanDelta,
    ciLow: paired.ciLow,
    ciHigh: paired.ciHigh,
    incumbentReward: incumbent.meanReward,
    candidateReward: candidate.meanReward,
    goalDelta: goal.meanDelta,
    goalCiLow: goal.ciLow,
    goalCiHigh: goal.ciHigh,
    incumbentGoal: incumbent.meanRcaAccuracy,
    candidateGoal: candidate.meanRcaAccuracy,
    incumbentRuns: counted(incumbent),
    candidateRuns: counted(candidate),
    incumbentExecutionSuccess: incumbent.executionSuccessRate,
    candidateExecutionSuccess: candidate.executionSuccessRate,
    incumbentLeaked: leaked(incumbent),
    candidateLeaked: leaked(candidate),
    reasons,
  };
};
