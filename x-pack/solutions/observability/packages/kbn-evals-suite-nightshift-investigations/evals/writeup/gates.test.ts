/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { knownNumbers, runReplyGates, splitSentences } from './gates';

const known = knownNumbers('checkout failed 127 times, 1,250 requests, p99 50.5 ms');

describe('runReplyGates', () => {
  it('passes a short answer-first reply with grounded numbers', () => {
    const gates = runReplyGates(
      'No. Checkout never charged anyone: all 127 payment calls failed before reaching the provider.\n\n- About 1,250 requests were affected.\n- Next step: alert on payment DNS errors.',
      1,
      known
    );
    expect(gates.failed).toEqual([]);
    expect(gates.pass).toBe(true);
    expect(gates.metrics).toMatchObject({ points: 2, headings: 0, tables: false });
    expect(gates.metrics.leadWords).toBeLessThanOrEqual(22);
  });

  it('flags length, headings, method narration and invented numbers', () => {
    const long = Array.from({ length: 30 }, () => 'The payment service failed again here.').join(
      ' '
    );
    const gates = runReplyGates(
      `**Root cause:** I queried the traces and found 4,031 errors.\n\n| a | b |\n|---|---|\n\n${long}`,
      1,
      known
    );
    expect(gates.pass).toBe(false);
    expect(gates.failed).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^\d+ words$/),
        '1 headings',
        'method: I queried',
        'ungrounded numbers: 4031',
      ])
    );
    expect(gates.metrics).toMatchObject({ tables: true, tableRows: 1 });
  });

  it('counts a long first sentence and too many points', () => {
    const lead =
      'The checkout service failed because the payment service could not resolve its own hostname during the whole incident window today, so every single order placed in that hour failed.';
    const gates = runReplyGates(
      `${lead}\n- one two three\n- four five six\n- seven eight nine\n- ten eleven twelve`,
      1,
      known
    );
    expect(gates.failed).toEqual(
      expect.arrayContaining([expect.stringMatching(/^first sentence \d+ words$/), '4 points'])
    );
  });

  it('limits a first-round wrap-up without points to four sentences', () => {
    const reply =
      'Payment failed for an hour. A flag caused it. The flag is off now. Nobody was charged. Orders resumed at once.';
    expect(runReplyGates(reply, 0, known).failed).toContain('wrap-up 5 sentences');
    expect(runReplyGates(reply, 1, known).failed).not.toContain('wrap-up 5 sentences');
  });

  it('accepts a number written with or without thousands separators', () => {
    expect(
      runReplyGates('About 1250 requests failed during the window today.', 1, known).metrics
        .ungroundedNumbers
    ).toEqual([]);
  });

  it('rejects a reply too short to answer anything', () => {
    expect(runReplyGates('Yes, fixed.', 1, known).failed).toContain('only 2 words');
  });
});

describe('tables and attachments in the reply', () => {
  const table = (rows: number) =>
    [
      '| Service | Errors |',
      '| --- | --- |',
      ...Array.from({ length: rows }, (_, i) => `| svc-${String.fromCharCode(97 + i)} | 127 |`),
    ].join('\n');

  it('allows a short table, whose rows count toward neither words nor sentences', () => {
    const gates = runReplyGates(
      `Checkout failed 127 times in the window.\n\n${table(3)}`,
      1,
      known
    );
    expect(gates.failed).toEqual([]);
    expect(gates.metrics).toMatchObject({ tableRows: 4, sentences: 1, words: 7 });
  });

  it('fails a table of more than 12 rows', () => {
    expect(
      runReplyGates(`Checkout failed 127 times in the window.\n${table(12)}`, 1, known).failed
    ).toEqual(['table of 13 rows in the reply']);
  });

  it('skips the minimum length when a table or an attachment carries the answer', () => {
    expect(runReplyGates(`Errors by service:\n${table(2)}`, 1, known).failed).toEqual([]);
    expect(
      runReplyGates('<render_attachment id="a1" />\nAll 127 errors.', 1, known).failed
    ).toEqual([]);
  });

  it('fails a reply that points at an attachment it never shows', () => {
    const reply = 'The full list of 127 failed orders is attached for the on-call team to review.';
    expect(runReplyGates(reply, 1, known).failed).toEqual([
      "mentions an attachment it doesn't show",
    ]);
    expect(runReplyGates(`${reply}\n<render_attachment id="orders" />`, 1, known).failed).toEqual(
      []
    );
  });

  it('ignores attachment tags when finding the first sentence', () => {
    const gates = runReplyGates(
      '<render_attachment id="a1" />\nNo customer was charged during the window.',
      1,
      known
    );
    expect(gates.metrics.leadWords).toBe(7);
  });
});

describe('splitSentences', () => {
  it('splits on sentence ends and line breaks, dropping fragments under three words', () => {
    expect(splitSentences('It failed at 14:30. Then it recovered fully.\nOK.\n- a b c d')).toEqual([
      'It failed at 14:30.',
      'Then it recovered fully.',
      '- a b c d',
    ]);
  });
});
