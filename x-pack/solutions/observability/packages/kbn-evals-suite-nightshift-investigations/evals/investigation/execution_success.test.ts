/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  assertExecutionSuccessRate,
  executionSuccessEvaluator,
  getExecutionFailure,
  getMinExecutionSuccessRate,
  MIN_SLICE_EXECUTION_SUCCESS_RATE,
} from './execution_success';
import { NO_CONCLUSION_ERROR } from './task';
import type { InvestigationTaskOutput } from './types';

const completed: InvestigationTaskOutput = {
  case_id: 'case',
  query: 'Investigate the signal.',
  investigation_id: 'investigation',
  conversation_id: 'investigation',
  workflow_status: 'complete',
  structured_report: { conclusion: 'The cache evicted hot keys.' },
};

describe('getExecutionFailure', () => {
  it('accepts a completed investigation with a conclusion or a summary', () => {
    expect(getExecutionFailure(completed)).toBeUndefined();
    expect(
      getExecutionFailure({ ...completed, structured_report: { summary: 'Cache evictions.' } })
    ).toBeUndefined();
  });

  it.each([
    [{ ...completed, execution_error: NO_CONCLUSION_ERROR }, NO_CONCLUSION_ERROR],
    [{ ...completed, investigation_id: undefined }, 'No investigation was started'],
    [{ ...completed, workflow_status: 'running' as const }, 'state running'],
    [{ ...completed, structured_report: { hypotheses: [] } }, 'neither a conclusion'],
  ])('reports why a run failed: %j', (output, reason) => {
    expect(getExecutionFailure(output)).toContain(reason);
  });

  it('reports a missing output', () => {
    expect(getExecutionFailure(null)).toBe('The task returned no output');
  });
});

describe('executionSuccessEvaluator', () => {
  const evaluate = (output: InvestigationTaskOutput) =>
    executionSuccessEvaluator.evaluate({
      input: { question: completed.query },
      output,
      expected: undefined,
      metadata: { case_id: completed.case_id },
    });

  it('scores completed runs 1 and failed runs 0 with the reason', async () => {
    await expect(evaluate(completed)).resolves.toMatchObject({ score: 1, label: 'completed' });
    await expect(
      evaluate({ ...completed, execution_error: NO_CONCLUSION_ERROR })
    ).resolves.toMatchObject({ score: 0, label: 'failed', explanation: NO_CONCLUSION_ERROR });
  });
});

describe('assertExecutionSuccessRate', () => {
  const failure = { caseId: 'd1-i1-imageSlowLoad-on', reason: NO_CONCLUSION_ERROR };

  it('passes six failed cases in 50', () => {
    expect(() => assertExecutionSuccessRate(Array(6).fill(failure), 50)).not.toThrow();
  });

  it('fails below the threshold and lists every failed case', () => {
    const failures = Array.from({ length: 20 }, (_, index) => ({
      ...failure,
      caseId: `case-${index}`,
    }));
    expect(() => assertExecutionSuccessRate(failures, 42)).toThrow(
      /22 of 42 investigations completed \(52%\), below the 80% threshold:\n- case-0: .*\n- case-1:/
    );
  });

  it('passes a slice that lost a few cases, but fails one an outage emptied', () => {
    expect(() =>
      assertExecutionSuccessRate(Array(3).fill(failure), 10, MIN_SLICE_EXECUTION_SUCCESS_RATE)
    ).not.toThrow();
    expect(() =>
      assertExecutionSuccessRate(Array(5).fill(failure), 10, MIN_SLICE_EXECUTION_SUCCESS_RATE)
    ).toThrow('5 of 10 investigations completed (50%), below the 60% threshold');
  });

  it('relaxes the gate only for a slice too small for the full-run rate', () => {
    expect(getMinExecutionSuccessRate({ sliced: true, runs: 10 })).toBe(
      MIN_SLICE_EXECUTION_SUCCESS_RATE
    );
    expect(getMinExecutionSuccessRate({ sliced: true, runs: 94 })).toBe(0.8);
    expect(getMinExecutionSuccessRate({ sliced: false, runs: 10 })).toBe(0.8);
  });

  it('fails a single-case dataset whose only run failed, and an empty run', () => {
    expect(() => assertExecutionSuccessRate([failure], 1)).toThrow('0 of 1');
    expect(() => assertExecutionSuccessRate([], 0)).toThrow('0 of 0');
  });
});
