/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationRound } from '@kbn/agent-builder-common';
import {
  decisionTreesAccessedEvaluator,
  latencySecondsEvaluator,
  outputTokensEvaluator,
  toolCallsTotalEvaluator,
  uncachedInputTokensEvaluator,
} from './efficiency_evaluators';
import type { InvestigationExample, InvestigationTaskOutput } from './types';
import { countToolCalls, extractUsage } from './usage';

const example = {
  input: { question: 'Why?' },
  metadata: { case_id: 'case' },
} as InvestigationExample;

const run = (output: Partial<InvestigationTaskOutput>) => ({
  ...example,
  output: { case_id: 'case', query: 'Why?', ...output } as InvestigationTaskOutput,
  expected: undefined,
});

describe('extractUsage', () => {
  it('sums usage and latency over every round', () => {
    const rounds = [
      {
        model_usage: {
          input_tokens: 100,
          cached_input_tokens: 40,
          output_tokens: 10,
          llm_calls: 2,
        },
        time_to_last_token: 1500,
      },
      {
        model_usage: { input_tokens: 50, output_tokens: 5, llm_calls: 1 },
        time_to_last_token: 500,
      },
    ] as ConversationRound[];
    expect(extractUsage(rounds)).toEqual({
      input_tokens: 150,
      cached_input_tokens: 40,
      output_tokens: 15,
      llm_calls: 3,
      latency_ms: 2000,
    });
  });
});

describe('countToolCalls', () => {
  it('counts only tool call steps across rounds', () => {
    const toolCall = { type: 'tool_call', tool_id: 'bash', params: {}, results: [] };
    const reasoning = { type: 'reasoning', reasoning: 'hm' };
    const rounds = [
      { steps: [toolCall, reasoning, toolCall] },
      { steps: [toolCall] },
    ] as unknown as ConversationRound[];
    expect(countToolCalls(rounds)).toBe(3);
  });
});

describe('efficiency evaluators', () => {
  const usage = {
    input_tokens: 1000,
    cached_input_tokens: 400,
    output_tokens: 70,
    llm_calls: 4,
    latency_ms: 12_345.6,
  };

  it('scores raw uncached input tokens, output tokens, latency and tool calls', async () => {
    const params = run({ usage, tool_call_count: 9 });
    expect((await uncachedInputTokensEvaluator.evaluate(params)).score).toBe(600);
    expect((await outputTokensEvaluator.evaluate(params)).score).toBe(70);
    expect((await latencySecondsEvaluator.evaluate(params)).score).toBe(12.346);
    expect((await toolCallsTotalEvaluator.evaluate(params)).score).toBe(9);
  });

  it('never reports negative uncached tokens', async () => {
    const params = run({ usage: { ...usage, cached_input_tokens: 2000 } });
    expect((await uncachedInputTokensEvaluator.evaluate(params)).score).toBe(0);
  });

  it('is n/a when the conversation was never read', async () => {
    const params = run({ execution_error: 'boom' });
    for (const evaluator of [
      uncachedInputTokensEvaluator,
      outputTokensEvaluator,
      latencySecondsEvaluator,
      toolCallsTotalEvaluator,
      decisionTreesAccessedEvaluator,
    ]) {
      expect(await evaluator.evaluate(params)).toMatchObject({ score: null, label: 'n/a' });
    }
  });

  it('counts accessed decision trees, and zero when a read conversation opened none', async () => {
    const opened = run({
      conversation_round_count: 1,
      decision_trees_accessed: [
        { tree_id: 'a', content: '' },
        { tree_id: 'b', content: '' },
      ],
    });
    expect((await decisionTreesAccessedEvaluator.evaluate(opened)).score).toBe(2);
    expect(
      (await decisionTreesAccessedEvaluator.evaluate(run({ conversation_round_count: 1 }))).score
    ).toBe(0);
  });
});
