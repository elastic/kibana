/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MessageRole } from '@kbn/inference-common';
import {
  buildReplay,
  fillPrompt,
  questionOf,
  replayCorpus,
  replayText,
  safeToolName,
} from './replay';
import type { RecordedRound } from './types';

const toolStep = (id: string, toolId: string, data: unknown) => ({
  type: 'tool_call',
  tool_id: toolId,
  tool_call_id: id,
  params: { command: `run ${id}` },
  results: [{ type: 'other', data }],
});

const rounds: RecordedRound[] = [
  {
    input: { message: 'Why did checkout fail?\n\n\nAdditional context: {"source":"manual"}' },
    steps: [
      { type: 'reasoning', reasoning: 'Check payment first.' },
      toolStep('c1', 'nightshift_sandbox_bash', { stdout: '127 errors' }),
      toolStep('c2', 'agentic_investigations.set_hypotheses', 'ok'),
    ],
    response: { message: 'Payment DNS failed.' },
  },
  {
    input: { message: 'Were customers charged?' },
    steps: [toolStep('c3', 'nightshift_sandbox_bash', 'x'.repeat(30_000))],
  },
];

describe('buildReplay', () => {
  it('renders earlier rounds whole and stops the replayed round before its reply', () => {
    const replay = buildReplay(rounds, 1, 'Prompt {{decision_trees_load_step}}end');
    expect(replay.system).toBe('Prompt end');
    expect(replay.question).toBe('Were customers charged?');
    expect(replay.roundIndex).toBe(1);
    expect(replay.toolNames).toEqual([
      'nightshift_sandbox_bash',
      'agentic_investigations_set_hypotheses',
    ]);
    expect(replay.messages.map((m) => m.role)).toEqual([
      MessageRole.User,
      MessageRole.Assistant,
      MessageRole.Tool,
      MessageRole.Assistant,
      MessageRole.Tool,
      MessageRole.Assistant,
      MessageRole.User,
      MessageRole.Assistant,
      MessageRole.Tool,
    ]);
    // Reasoning rides on the next tool call.
    expect(replay.messages[1]).toMatchObject({
      content: 'Check payment first.',
      toolCalls: [{ toolCallId: 'c1', function: { name: 'nightshift_sandbox_bash' } }],
    });
    expect(replay.messages[5]).toEqual({
      role: MessageRole.Assistant,
      content: 'Payment DNS failed.',
    });
    // A long result is clipped to the per-result cap.
    const last = replay.messages.at(-1) as unknown as { response: { result: string } };
    expect(last.response.result).toHaveLength(20_000 + ' …[truncated]'.length);
  });

  it('replays the first round with only its own steps', () => {
    const replay = buildReplay(rounds, 0, 'p');
    expect(replay.messages).toHaveLength(5);
    expect(replay.question).toBe('Why did checkout fail?');
  });

  it('clips earlier rounds first when the history is over budget', () => {
    const big = Array.from({ length: 30 }, (_, i) =>
      toolStep(`b${i}`, 'nightshift_sandbox_bash', 'y'.repeat(20_000))
    );
    const replay = buildReplay([{ ...rounds[0], steps: big }, rounds[1]], 1, 'p');
    const results = replay.messages
      .filter((m) => m.role === MessageRole.Tool)
      .map((m) => (m as unknown as { response: { result: string } }).response.result.length);
    expect(Math.max(...results.slice(0, -1))).toBeLessThan(20_000);
    expect(results.at(-1)).toBeGreaterThan(results[0]);
    expect(replay.chars).toBeLessThanOrEqual(420_000);
  });

  it('rejects a round that does not exist', () => {
    expect(() => buildReplay(rounds, 2, 'p')).toThrow('out of range');
  });
});

describe('replay helpers', () => {
  it('fills every prompt placeholder with nothing', () => {
    expect(
      fillPrompt(
        'a{{decision_trees_load_step}}b{{semantic_memory_load_step}}c{{decision_trees_section}}'
      )
    ).toBe('abc');
  });

  it('makes tool ids safe for model APIs', () => {
    expect(safeToolName('agentic_investigations.set_impact')).toBe(
      'agentic_investigations_set_impact'
    );
  });

  it('drops the context the product appends to a question', () => {
    expect(questionOf(' Why?\n\n\nAdditional context: {} ')).toBe('Why?');
  });

  it('collects user messages and tool results up to the replayed round', () => {
    const corpus = replayCorpus(rounds, 0);
    expect(corpus).toContain('127 errors');
    expect(corpus).not.toContain('Were customers charged?');
  });

  it('renders the history as text for a judge, keeping the end when cut', () => {
    const text = replayText(buildReplay(rounds, 1, 'p'), 1_000);
    expect(text.startsWith('…[earlier history cut]')).toBe(true);
    expect(text).toContain('xxx');
    expect(replayText(buildReplay(rounds, 0, 'p'))).toContain('CALL c1 nightshift_sandbox_bash');
  });
});
