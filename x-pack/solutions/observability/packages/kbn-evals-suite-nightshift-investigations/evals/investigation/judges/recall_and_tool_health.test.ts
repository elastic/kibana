/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundInferenceClient } from '@kbn/inference-common';
import type { EvalConnector } from '@kbn/evals';
import { ToolingLog } from '@kbn/tooling-log';
import type { InvestigationTaskOutput } from '../types';
import { createRecallUsageEvaluators, createToolCallHealthEvaluators } from '.';

jest.mock('@kbn/inference-tracing', () => ({
  ElasticGenAIAttributes: { InferenceSpanKind: 'elastic.inference.span.kind' },
  withActiveInferenceSpan: (_name: string, _options: object, callback: () => Promise<object>) =>
    callback(),
}));

const judgeReturning = (args: object) => {
  const prompt = jest.fn().mockResolvedValue({ toolCalls: [{ function: { arguments: args } }] });
  return {
    prompt,
    deps: {
      inferenceClient: { prompt } as unknown as BoundInferenceClient,
      evaluationConnector: { id: 'judge' } as EvalConnector,
      log: new ToolingLog(),
    },
  };
};

const example = { input: { question: 'Why?' }, expected: undefined, metadata: { case_id: 'c' } };

const step = (toolId: string, params: Record<string, unknown>, result = 'ok') => ({
  tool_id: toolId,
  params,
  result,
});

const output = (overrides: Partial<InvestigationTaskOutput> = {}): InvestigationTaskOutput => ({
  case_id: 'c',
  query: 'Why?',
  investigation_id: 'run-1',
  structured_report: { conclusion: 'A memory-backed cause.' },
  tool_call_trajectory: [step('bash', {}), step('bash', {}), step('bash', {})],
  tool_call_count: 3,
  ...overrides,
});

describe('tool call health', () => {
  it('counts failed and no-data calls from one judge call, ignoring invalid steps', async () => {
    const { deps, prompt } = judgeReturning({
      failed_calls: [
        { step: 1, reason: 'Unknown column.' },
        { step: 1, reason: 'duplicate' },
        { step: 99, reason: 'out of range' },
      ],
      empty_calls: [
        { step: 1, reason: 'also listed as failed' },
        { step: 3, reason: 'Empty index list.' },
      ],
    });
    const [failed, empty] = createToolCallHealthEvaluators(deps);
    const params = { ...example, output: output() };
    const failedResult = await failed.evaluate(params);
    const emptyResult = await empty.evaluate(params);
    expect(failedResult).toMatchObject({ score: 1, label: 'failed', metadata: { steps: [1] } });
    expect(emptyResult).toMatchObject({ score: 1, label: 'no-data', metadata: { steps: [3] } });
    expect(prompt).toHaveBeenCalledTimes(1);
  });

  it('scores zero when nothing went wrong and is n/a without a trajectory', async () => {
    const { deps } = judgeReturning({ failed_calls: [], empty_calls: [] });
    const [failed] = createToolCallHealthEvaluators(deps);
    expect(await failed.evaluate({ ...example, output: output() })).toMatchObject({
      score: 0,
      label: 'none',
    });
    expect(
      await failed.evaluate({ ...example, output: output({ tool_call_trajectory: undefined }) })
    ).toMatchObject({ score: null, label: 'n/a' });
  });
});

describe('tool call health on a truncated trajectory', () => {
  it('abstains, without calling the judge, when fewer calls were captured than were made', async () => {
    const { deps, prompt } = judgeReturning({ failed_calls: [], empty_calls: [] });
    for (const evaluator of createToolCallHealthEvaluators(deps)) {
      const result = await evaluator.evaluate({
        ...example,
        output: output({ tool_call_count: 40 }),
      });
      expect(result).toMatchObject({ score: null, label: 'n/a' });
    }
    expect(prompt).not.toHaveBeenCalled();
  });
});

describe('recall usage', () => {
  const recallOutput = (overrides: Partial<InvestigationTaskOutput> = {}) =>
    output({
      tool_call_trajectory: [
        step('nightshift_sandbox_view_file', { file_path: '/workspace/cortex/db.md' }),
        step('nightshift_sandbox_view_file', { file_path: '/workspace/memories/one.md' }),
        step('nightshift_sandbox_view_file', { file_path: '/workspace/memories/two.md' }),
      ],
      ...overrides,
    });

  it('scores a redirect by cortex and counts only memories that were read and cited', async () => {
    const { deps, prompt } = judgeReturning({
      cortex_influence: 'redirected',
      cortex_reasoning: 'Switched to the DB after reading it.',
      memories_cited: ['memories/one.md', 'memories/never_read.md'],
      memories_reasoning: 'The report repeats memory one.',
    });
    const [cortex, memories] = createRecallUsageEvaluators(deps);
    const params = { ...example, output: recallOutput() };
    expect(await cortex.evaluate(params)).toMatchObject({ score: 1, label: 'redirected' });
    expect(await memories.evaluate(params)).toMatchObject({
      score: 1,
      label: 'cited',
      metadata: {
        memories_read: ['memories/one.md', 'memories/two.md'],
        memories_cited: ['memories/one.md'],
      },
    });
    expect(prompt).toHaveBeenCalledTimes(1);
  });

  it('counts each memory file a recursive grep exposed, not the directory', async () => {
    const { deps } = judgeReturning({
      cortex_influence: 'none',
      cortex_reasoning: '',
      memories_cited: ['memories/one.md', 'memories/two.md', 'memories'],
      memories_reasoning: '',
    });
    const [, memories] = createRecallUsageEvaluators(deps);
    const result = await memories.evaluate({
      ...example,
      output: output({
        tool_call_trajectory: [
          {
            tool_id: 'nightshift_sandbox_bash',
            params: { command: 'grep -rn timeout .', working_directory: '/workspace/memories' },
            result: 'exit_code: 0 | stdout: ./one.md:3:timeout\n./two.md:8:timeout',
          },
        ],
        tool_call_count: 1,
      }),
    });
    expect(result).toMatchObject({
      score: 2,
      metadata: { memories_cited: ['memories/one.md', 'memories/two.md'] },
    });
  });

  it('scores a confirmatory cortex read as 0 and an unrecognized label as none', async () => {
    const { deps } = judgeReturning({
      cortex_influence: 'confirmatory',
      cortex_reasoning: '',
      memories_cited: [],
      memories_reasoning: '',
    });
    const [cortex, memories] = createRecallUsageEvaluators(deps);
    const params = { ...example, output: recallOutput() };
    expect(await cortex.evaluate(params)).toMatchObject({ score: 0, label: 'confirmatory' });
    expect(await memories.evaluate(params)).toMatchObject({ score: 0, label: 'not_cited' });

    const { deps: oddDeps } = judgeReturning({ cortex_influence: 'bogus' });
    const [oddCortex] = createRecallUsageEvaluators(oddDeps);
    expect(await oddCortex.evaluate({ ...example, output: recallOutput() })).toMatchObject({
      score: 0,
      label: 'none',
    });
  });

  it('is n/a, without calling the judge, when no cortex or memory file was read', async () => {
    const { deps, prompt } = judgeReturning({});
    for (const evaluator of createRecallUsageEvaluators(deps)) {
      expect(await evaluator.evaluate({ ...example, output: output() })).toMatchObject({
        score: null,
        label: 'n/a',
      });
    }
    expect(prompt).not.toHaveBeenCalled();
  });

  it('is n/a for memories when the run produced no answer', async () => {
    const { deps, prompt } = judgeReturning({});
    const [, memories] = createRecallUsageEvaluators(deps);
    const result = await memories.evaluate({
      ...example,
      output: recallOutput({ structured_report: undefined }),
    });
    expect(result).toMatchObject({ score: null, label: 'n/a' });
    expect(prompt).not.toHaveBeenCalled();
  });
});
