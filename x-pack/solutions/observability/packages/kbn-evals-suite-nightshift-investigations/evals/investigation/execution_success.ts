/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import type { InvestigationExample, InvestigationTaskOutput } from './types';

export const EXECUTION_SUCCESS_EVALUATOR = 'execution_success';

/**
 * The share of runs that must complete with a recorded conclusion for the eval to pass. ORCA runs
 * complete 88-92% of the time, mostly losing cases to the agent's cycle budget, and that shouldn't
 * fail a 50-case benchmark. An outage that leaves many investigations without a conclusion (an
 * exhausted sandbox pool, say) should.
 */
export const MIN_EXECUTION_SUCCESS_RATE = 0.8;

/**
 * The same gate for a run of one small slice of a dataset. At 88-92% completion a 10-task slice
 * falls below 80% 4-11% of the time, so one of five slices would fail 19-44% of builds. At 60% a
 * build loses a slice about as often as the unsliced run failed, and an outage still fails each of
 * them.
 */
export const MIN_SLICE_EXECUTION_SUCCESS_RATE = 0.6;

/** Below this many runs a slice is too small for the full-run rate. */
const MIN_RUNS_FOR_FULL_RATE = 50;

/** The completion gate for a run: the slice rate only for a slice too small for the full rate. */
export const getMinExecutionSuccessRate = ({
  sliced,
  runs,
}: {
  sliced: boolean;
  runs: number;
}): number =>
  sliced && runs < MIN_RUNS_FOR_FULL_RATE
    ? MIN_SLICE_EXECUTION_SUCCESS_RATE
    : MIN_EXECUTION_SUCCESS_RATE;

/** Why a run didn't complete its investigation, or undefined when it did. */
export const getExecutionFailure = (
  output: InvestigationTaskOutput | null | undefined
): string | undefined => {
  if (!output) return 'The task returned no output';
  if (output.execution_error) return output.execution_error;
  if (!output.investigation_id || !output.conversation_id) return 'No investigation was started';
  if (output.workflow_status !== 'complete') {
    return `The investigation ended in state ${output.workflow_status ?? 'unknown'}`;
  }
  if (!output.structured_report?.conclusion && !output.structured_report?.summary) {
    return 'The investigation recorded neither a conclusion nor a summary';
  }
  return undefined;
};

/** Scores 1 for a run whose investigation completed with a conclusion, 0 otherwise. */
export const executionSuccessEvaluator: Evaluator<InvestigationExample, InvestigationTaskOutput> = {
  name: EXECUTION_SUCCESS_EVALUATOR,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output }) => {
    const failure = getExecutionFailure(output);
    return failure
      ? { score: 0, label: 'failed', explanation: failure }
      : {
          score: 1,
          label: 'completed',
          explanation: 'The investigation completed and recorded a conclusion.',
        };
  },
};

/**
 * Passes while at least `minimumRate` of `total` runs completed. The error lists every failed
 * case, so one report shows whether failures share a cause.
 */
export const assertExecutionSuccessRate = (
  failures: ReadonlyArray<{ caseId: string; reason: string }>,
  total: number,
  minimumRate: number = MIN_EXECUTION_SUCCESS_RATE
): void => {
  const rate = total === 0 ? 0 : (total - failures.length) / total;
  if (rate >= minimumRate) return;
  throw new Error(
    `${total - failures.length} of ${total} investigations completed (${Math.round(
      rate * 100
    )}%), below the ${Math.round(minimumRate * 100)}% threshold:\n${failures
      .map(({ caseId, reason }) => `- ${caseId}: ${reason}`)
      .join('\n')}`
  );
};
