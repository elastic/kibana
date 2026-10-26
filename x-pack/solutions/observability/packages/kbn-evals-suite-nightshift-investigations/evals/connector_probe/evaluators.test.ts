/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import {
  connectorUsedEvaluator,
  createReferenceBehaviourEvaluator,
  createWithinTimeBudgetEvaluator,
  getTimeBudgetSeconds,
} from './evaluators';
import type { ConnectorProbeExample, ConnectorProbeTaskOutput } from './types';

const example: ConnectorProbeExample = {
  input: { question: 'Count logs' },
  output: { reference_answer: 'The agent reports the count.' },
  metadata: { case_id: 'case-1' },
};

const output = (overrides: Partial<ConnectorProbeTaskOutput> = {}): ConnectorProbeTaskOutput => ({
  case_id: 'case-1',
  query: 'Count logs',
  response: 'There are 42 documents.',
  duration_ms: 12_000,
  tool_call_trajectory: [
    {
      tool_id: 'nightshift_sandbox_view_file',
      params: { path: '/workspace/elastic.md' },
      result: '',
    },
    {
      tool_id: 'nightshift_sandbox_bash',
      params: { command: 'curl ...', connector_id: 'telemetry' },
      result: 'exit_code: 0',
    },
  ],
  ...overrides,
});

const params = (taskOutput: ConnectorProbeTaskOutput) => ({
  input: example.input,
  output: taskOutput,
  expected: example.output,
  metadata: example.metadata,
});

describe('connector probe evaluators', () => {
  it('passes connector_used only when a bash call carried a connector_id', async () => {
    expect((await connectorUsedEvaluator.evaluate(params(output()))).score).toBe(1);
    expect(
      (
        await connectorUsedEvaluator.evaluate(
          params(
            output({
              tool_call_trajectory: [
                { tool_id: 'nightshift_sandbox_bash', params: { command: 'ls' }, result: '' },
              ],
            })
          )
        )
      ).score
    ).toBe(0);
    expect(
      (await connectorUsedEvaluator.evaluate(params(output({ execution_error: 'boom' })))).score
    ).toBe(0);
  });

  it('scores the run against the time budget', async () => {
    const evaluator = createWithinTimeBudgetEvaluator(30);

    expect((await evaluator.evaluate(params(output({ duration_ms: 29_000 })))).score).toBe(1);
    expect((await evaluator.evaluate(params(output({ duration_ms: 31_000 })))).score).toBe(0);
  });

  it('reads the budget from the environment and rejects invalid values', () => {
    expect(getTimeBudgetSeconds(undefined)).toBe(30);
    expect(getTimeBudgetSeconds('45')).toBe(45);
    expect(() => getTimeBudgetSeconds('fast')).toThrow('must be a positive number');
  });

  it('grades against a per-example criterion built from the reference answer', async () => {
    const evaluate = jest.fn().mockResolvedValue({ score: 1 });
    const criteria = jest.fn(
      (): Evaluator => ({ name: 'criteria', kind: 'LLM', direction: 'maximize', evaluate })
    );
    const evaluator = createReferenceBehaviourEvaluator({ criteria });

    expect((await evaluator.evaluate(params(output()))).score).toBe(1);
    expect(criteria).toHaveBeenLastCalledWith([
      expect.stringContaining('The agent reports the count.'),
    ]);

    evaluate.mockClear();
    expect((await evaluator.evaluate(params(output({ execution_error: 'boom' })))).score).toBe(0);
    expect(evaluate).not.toHaveBeenCalled();
  });
});
