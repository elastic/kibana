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
import type { EvalConnector } from '@kbn/evals';
import {
  runInvestigation,
  waitForInvestigationToEnd,
} from '@kbn/evals-suite-nightshift-investigations/evals/investigation/task';
import type { InvestigationTaskOutput } from '@kbn/evals-suite-nightshift-investigations/evals/investigation/types';
import { createOrcaEvaluators } from '@kbn/evals-suite-nightshift-investigations/evals/investigation/judges';
import {
  mintOrcaCutoffKeys,
  resolveOrcaEsCredentials,
  withOrcaKeysInvalidated,
} from '@kbn/evals-suite-nightshift-investigations/evals/investigation/orca_cutoff';
import { createOrcaCutoffGate } from '@kbn/evals-suite-nightshift-investigations/evals/investigation/orca_cutoff_gate';
import { saveOrcaConnector } from '@kbn/evals-suite-nightshift-investigations/evals/investigation/orca_connector';
import {
  ORCABENCH_ES_CONNECTOR_ID,
  saveConnectorsOnInvestigator,
} from '@kbn/evals-suite-nightshift-investigations/evals/investigation/connector_sets';
import type { OrcaTask } from './dataset';
import type { LaneSettings } from './paths';
import { createLaneFetch, createLaneKbnClient } from './kibana';
import { costUsd } from './pricing';

export type TelemetryVariant = 'full' | 'no-flags';

export interface TaskRun {
  exampleId: string;
  caseId: string;
  /** The cluster the gate resamples: the ORCA incident the task was cut from. */
  seedId: string;
  control: boolean;
  tier: string;
  rollout: number;
  question: string;
  plausibleFlags: string[];
  namedFlags?: string[];
  rcaAccuracy: number | null;
  hallucination: number | null;
  control_score: number | null;
  /**
   * `0.7 · accuracy + 0.3 · (1 − hallucination)` on incidents, `control` on no-incident tasks.
   * Null when ORCA does not score the run (crash, timeout, nothing recorded).
   */
  reward: number | null;
  /** The investigation ended with a conclusion and no execution error. */
  executionSuccess: boolean;
  executionError?: string;
  investigationId?: string;
  conclusion?: string;
  toolCalls: number;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  llmCalls: number;
  latencyMs: number;
  costUsd: number;
  /** Full trajectory, report and scores on disk, for the proposer bundle. */
  tracePath: string;
}

export interface RunSummary {
  label: string;
  configHash: string;
  telemetryVariant: TelemetryVariant;
  agentConnectorId: string;
  runs: TaskRun[];
  /** Mean over scored runs. */
  meanReward: number;
  scoredRuns: number;
  executionSuccessRate: number;
  meanRcaAccuracy: number | null;
  meanHallucination: number | null;
  meanControl: number | null;
  totalCostUsd: number;
  meanToolCalls: number;
  meanLatencyMs: number;
}

const mean = (values: number[]): number =>
  values.length === 0 ? 0 : values.reduce((total, value) => total + value, 0) / values.length;

const meanOrNull = (values: Array<number | null>): number | null => {
  const present = values.filter((value): value is number => value !== null);
  return present.length ? mean(present) : null;
};

const asScore = (value: unknown): number | null => (typeof value === 'number' ? value : null);

/** The eval suite's 30-minute investigation deadline plus the two-minute settle period. */
const KEY_LIFETIME_PER_BATCH_MS = 34 * 60_000;
const ORCA_SETTLE_MS = 2 * 60_000;

/**
 * Lanes with a run in flight. A lane has one investigator with one ORCA connector, whose key the
 * cutoff gate swaps; two runs on one lane would swap it under each other's investigations.
 */
const busyLanes = new Set<string>();

export const runVariant = async (options: RunVariantOptions): Promise<RunSummary> => {
  const { lane } = options;
  if (busyLanes.has(lane.kibanaUrl)) {
    throw new Error(`${lane.lane} (${lane.kibanaUrl}) already has a run in flight`);
  }
  busyLanes.add(lane.kibanaUrl);
  try {
    return await runVariantOnLane(options);
  } finally {
    busyLanes.delete(lane.kibanaUrl);
  }
};

interface RunVariantOptions {
  label: string;
  /** Identity of the harness under test: a hash of the editable files and, optionally, its diff. */
  variant: { hash: string; diff?: string };
  lane: LaneSettings;
  tasks: OrcaTask[];
  rollouts: number;
  concurrency?: number;
  agentConnectorId: string;
  judgeConnectorId: string;
  telemetryVariant?: TelemetryVariant;
  outputDir: string;
  log: ToolingLog;
}

const runVariantOnLane = async ({
  label,
  variant,
  lane,
  tasks,
  rollouts,
  concurrency = 8,
  agentConnectorId,
  judgeConnectorId,
  telemetryVariant = 'no-flags',
  outputDir,
  log,
}: RunVariantOptions): Promise<RunSummary> => {
  const fetch = createLaneFetch(lane);
  const kbnClient = createLaneKbnClient(lane, log);
  const traceDir = Path.join(outputDir, label, 'traces');
  Fs.mkdirSync(traceDir, { recursive: true });

  const work = tasks.flatMap((task) =>
    Array.from({ length: rollouts }, (unused, rollout) => ({ task, rollout }))
  );
  const cutoffs = [...new Set(tasks.map(({ cutoff }) => cutoff))];
  const batches = cutoffs.reduce(
    (sum, cutoff) =>
      sum +
      Math.ceil((tasks.filter((task) => task.cutoff === cutoff).length * rollouts) / concurrency),
    0
  );
  log.info(
    `[harness-opt] "${label}" on ${lane.lane} (variant ${variant.hash}, ${telemetryVariant}): ${tasks.length} tasks × ${rollouts} over ${cutoffs.length} cutoffs, ~${batches} batches`
  );

  const evaluationConnector = {
    type: 'inference_endpoint',
    id: judgeConnectorId,
    name: judgeConnectorId,
    inferenceId: judgeConnectorId,
    provider: 'elastic',
    taskType: 'chat_completion',
  } as unknown as EvalConnector;
  const evaluators = createOrcaEvaluators({
    inferenceClient: createRestClient({ fetch, bindTo: { connectorId: judgeConnectorId } }),
    evaluationConnector,
    log,
  });

  const credentials = resolveOrcaEsCredentials();
  const { apiKeys, invalidate } = await mintOrcaCutoffKeys({
    credentials,
    cutoffs,
    variant: telemetryVariant,
    expiresInMs: batches * KEY_LIFETIME_PER_BATCH_MS + 10 * 60_000,
  });
  const keyFor = (cutoff: string): string => {
    const apiKey = apiKeys.get(cutoff);
    if (!apiKey) throw new Error(`No ORCA key was minted for cutoff ${cutoff}`);
    return apiKey;
  };

  const scoreRun = async (
    task: OrcaTask,
    rollout: number,
    output: InvestigationTaskOutput
  ): Promise<TaskRun> => {
    const { example } = task;
    const results = await Promise.all(
      evaluators.map(async (evaluator) => {
        try {
          return await evaluator.evaluate({
            input: example.input,
            output,
            expected: example.output,
            metadata: example.metadata,
          });
        } catch (error) {
          log.warning(`[${label}] ${evaluator.name} failed on ${task.caseId}: ${String(error)}`);
          return { score: null, label: 'judge-error', explanation: String(error) };
        }
      })
    );
    const [accuracy, hallucination, control] = results;
    const rcaAccuracy = asScore(accuracy.score);
    const hallucinationScore = asScore(hallucination.score);
    const controlScore = asScore(control.score);
    const reward = task.control
      ? controlScore
      : rcaAccuracy === null
      ? null
      : 0.7 * rcaAccuracy + 0.3 * (1 - (hallucinationScore ?? 0));
    const usage = output.usage;
    const namedFlags = (accuracy.metadata as { named_flags?: string[] } | undefined)?.named_flags;
    const plausibleFlags = (example.metadata.plausible_flags as string[] | undefined) ?? [];
    const tracePath = Path.join(traceDir, `${task.caseId}-r${rollout}.json`);
    const run: TaskRun = {
      exampleId: task.id,
      caseId: task.caseId,
      seedId: task.incident,
      control: task.control,
      tier: task.tier,
      rollout,
      question: example.input.question,
      plausibleFlags,
      namedFlags,
      rcaAccuracy,
      hallucination: hallucinationScore,
      control_score: controlScore,
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
      tracePath,
    };
    Fs.writeFileSync(
      tracePath,
      JSON.stringify(
        {
          case_id: task.caseId,
          incident: task.incident,
          control: task.control,
          question: example.input.question,
          plausible_flags: plausibleFlags,
          named_flags: namedFlags,
          scores: {
            reward,
            orca_rca_accuracy: rcaAccuracy,
            orca_hallucination: hallucinationScore,
            orca_control: controlScore,
          },
          judge_explanations: {
            orca_rca_accuracy: accuracy.explanation,
            orca_hallucination: hallucination.explanation,
            orca_control: control.explanation,
          },
          execution_error: output.execution_error,
          report: output.structured_report,
          usage,
          tool_call_count: output.tool_call_count,
          tool_call_trajectory: output.tool_call_trajectory,
        },
        null,
        2
      )
    );
    log.info(
      `[${label}] ${task.caseId} r${rollout}: reward ${reward?.toFixed(2) ?? 'unscored'}${
        output.execution_error ? ` (error: ${output.execution_error.slice(0, 160)})` : ''
      }, ${run.toolCalls} tool calls, $${run.costUsd.toFixed(3)}`
    );
    return run;
  };

  const runs = await withOrcaKeysInvalidated(invalidate, async () => {
    await saveOrcaConnector(kbnClient, { url: credentials.url, apiKey: keyFor(cutoffs[0]) });
    await saveConnectorsOnInvestigator(fetch, [ORCABENCH_ES_CONNECTOR_ID]);
    const inCutoff = createOrcaCutoffGate({
      concurrency,
      activate: (cutoff) =>
        saveOrcaConnector(kbnClient, { url: credentials.url, apiKey: keyFor(cutoff) }),
    });
    return Promise.all(
      work.map(({ task, rollout }) =>
        inCutoff(task.cutoff, async () => {
          const output = await runInvestigation(fetch, task.example, { id: agentConnectorId });
          if (
            output.investigation_id &&
            !(await waitForInvestigationToEnd(fetch, output.investigation_id, ORCA_SETTLE_MS))
          ) {
            throw new Error(
              `Investigation ${output.investigation_id} (${task.caseId}) outlived its timeout`
            );
          }
          return { task, rollout, output };
        })
      )
    );
  });

  // Judges run after every investigation ended: they never hold a cutoff's slot.
  const scored = await Promise.all(
    runs.map(({ task, rollout, output }) => scoreRun(task, rollout, output))
  );

  const scoredRuns = scored.filter((run) => run.reward !== null);
  const summary: RunSummary = {
    label,
    configHash: variant.hash,
    telemetryVariant,
    agentConnectorId,
    runs: scored,
    meanReward: mean(scoredRuns.map((run) => run.reward as number)),
    scoredRuns: scoredRuns.length,
    executionSuccessRate: mean(scored.map((run) => (run.executionSuccess ? 1 : 0))),
    meanRcaAccuracy: meanOrNull(scored.filter((run) => !run.control).map((r) => r.rcaAccuracy)),
    meanHallucination: meanOrNull(scored.filter((run) => !run.control).map((r) => r.hallucination)),
    meanControl: meanOrNull(scored.filter((run) => run.control).map((r) => r.control_score)),
    totalCostUsd: scored.reduce((total, run) => total + run.costUsd, 0),
    meanToolCalls: mean(scored.map((run) => run.toolCalls)),
    meanLatencyMs: mean(scored.map((run) => run.latencyMs)),
  };

  Fs.writeFileSync(
    Path.join(outputDir, `${label}.json`),
    JSON.stringify({ summary: { ...summary, runs: undefined }, variant, runs: scored }, null, 2)
  );
  log.info(
    `[harness-opt] "${label}": reward ${summary.meanReward.toFixed(3)} (n=${summary.scoredRuns}/${
      scored.length
    }), execution ${summary.executionSuccessRate.toFixed(2)}, accuracy ${
      summary.meanRcaAccuracy?.toFixed(2) ?? 'n/a'
    }, hallucination ${summary.meanHallucination?.toFixed(2) ?? 'n/a'}, control ${
      summary.meanControl?.toFixed(2) ?? 'n/a'
    }, $${summary.totalCostUsd.toFixed(2)}, ${summary.meanToolCalls.toFixed(1)} tool calls`
  );
  return summary;
};
