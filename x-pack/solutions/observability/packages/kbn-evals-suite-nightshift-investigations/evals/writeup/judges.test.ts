/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { comparePair, judgeFaithfulness, parseFaithfulness, winShare } from './judges';
import { buildReplay } from './replay';

const toolAnswer = (name: string, args: unknown) => ({
  content: '',
  toolCalls: [{ toolCallId: 't', function: { name, arguments: args } }],
});

/** Answers pairwise prompts by preferring whichever reply is shorter. */
const shorterWins = () => ({
  chatComplete: jest.fn(async ({ messages }: { messages: Array<{ content: unknown }> }) => {
    const [, a, b] = String(messages[0].content).split(/# Reply [AB]\n/);
    return toolAnswer('judge_pair', {
      winner: a.trim().length < b.trim().length ? 'A' : 'B',
      reason: 'shorter',
    });
  }),
});

describe('comparePair', () => {
  it('asks in both orders and counts from the first reply’s side', async () => {
    const client = shorterWins();
    const tally = await comparePair(client as never, {
      question: 'Were customers charged?',
      firstRound: false,
      a: 'No.',
      b: 'No, and here is a much longer reply.',
      votes: 2,
    });
    expect(tally).toEqual({ win: 4, loss: 0, tie: 0, failed: 0 });
    expect(client.chatComplete).toHaveBeenCalledTimes(4);
    expect(client.chatComplete.mock.calls[0][0]).toMatchObject({
      toolChoice: { function: 'judge_pair' },
    });
  });

  it('counts a judge that never answers as failed', async () => {
    const client = {
      chatComplete: jest.fn().mockResolvedValue({ content: 'no tool', toolCalls: [] }),
    };
    const tally = await comparePair(client, {
      question: 'q',
      firstRound: true,
      a: 'a',
      b: 'b',
      votes: 1,
    });
    expect(tally).toEqual({ win: 0, loss: 0, tie: 0, failed: 2 });
  });
});

describe('winShare', () => {
  it('counts a tie as half and ignores failed votes', () => {
    expect(winShare({ win: 2, loss: 1, tie: 1, failed: 3 })).toBe(0.625);
    expect(winShare({ win: 0, loss: 0, tie: 0, failed: 4 })).toBeNull();
  });
});

describe('faithfulness', () => {
  it('parses a 1–5 score and rejects anything else', () => {
    expect(parseFaithfulness({ score: 4, unsupported_claims: ['x'] })).toEqual({
      score: 4,
      unsupported_claims: ['x'],
    });
    expect(parseFaithfulness('{"score":5}')).toEqual({ score: 5, unsupported_claims: [] });
    expect(parseFaithfulness({ score: 7, unsupported_claims: [] })).toBeNull();
  });

  it('shows the judge the replay history and the reply', async () => {
    const client = {
      chatComplete: jest
        .fn()
        .mockResolvedValue(
          toolAnswer('judge_faithfulness', { score: 3, unsupported_claims: ['charged twice'] })
        ),
    };
    const replay = buildReplay(
      [{ input: { message: 'Were customers charged?' }, steps: [] }],
      0,
      'prompt'
    );
    await expect(judgeFaithfulness(client, 'Yes, twice.', replay)).resolves.toEqual({
      score: 3,
      unsupported_claims: ['charged twice'],
    });
    const { messages } = client.chatComplete.mock.calls[0][0];
    expect(messages[0].content).toContain('## USER\nWere customers charged?');
    expect(messages[0].content).toContain(
      '# The reply to check (closing the last round)\nYes, twice.'
    );
  });
});
