/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toWriteupConversation } from './build';
import { ORCA_WRITEUP_RELEASE, toWriteupExamples } from './datasets';
import {
  formatGolden,
  goldenPath,
  goldensByCase,
  goldensDirFor,
  parseGolden,
  readGoldens,
  type Golden,
} from './goldens';

const golden: Golden = {
  case_id: 'orca-x',
  round_index: 1,
  source: 'variant-b',
  question: 'Charged twice?\n\nCheck the retries.',
  reply: 'No one was charged twice.\n- 228 charges, 228 distinct IDs.',
};

const examples = toWriteupExamples(
  toWriteupConversation('orca-x', [
    { input: { message: 'Why did checkout fail?' }, steps: [], response: { message: 'DNS.' } },
    {
      input: { message: 'Charged twice?\n\nCheck the retries.' },
      steps: [],
      response: { message: 'No.' },
    },
  ])
);

describe('golden files', () => {
  it('read back what was written', () => {
    expect(parseGolden(formatGolden(golden))).toEqual(golden);
  });

  it('quote the question above the reply', () => {
    expect(formatGolden(golden)).toContain(
      '> **Asked:** Charged twice?\n>\n> Check the retries.\n\nNo one was charged twice.'
    );
  });

  it('refuse a file without a quoted question or a reply', () => {
    expect(() => parseGolden('---\ncase_id: a\n---\n\nJust a reply.\n', 'a.md')).toThrow('a.md');
    expect(() =>
      parseGolden('---\ncase_id: a\nround_index: 0\nsource: s\n---\n\n> **Asked:** Q\n\n')
    ).toThrow('the reply is empty');
  });

  it('live under the dataset, conversation and 1-based round', () => {
    expect(goldenPath(goldensDirFor('nightshift/writeup-orca-v1', '/g'), golden)).toBe(
      '/g/writeup_orca_v1/orca_x/round_2.md'
    );
  });
});

describe('goldensByCase', () => {
  it('keys goldens by the example they answer', () => {
    expect(goldensByCase([golden], examples)).toEqual(new Map([['orca-x/r2', golden.reply]]));
  });

  it('refuses a golden for a round the dataset lacks or asks differently', () => {
    expect(() => goldensByCase([{ ...golden, round_index: 4 }], examples)).toThrow(
      'no recorded round'
    );
    expect(() => goldensByCase([{ ...golden, question: 'Refunded?' }], examples)).toThrow(
      'different question'
    );
  });

  it('can require a golden for every recorded round', () => {
    expect(() => goldensByCase([golden], examples, { everyRecordedRound: true })).toThrow(
      'No golden for recorded rounds: orca-x/r1'
    );
    expect(
      goldensByCase(
        [{ ...golden, round_index: 0, question: 'Why did checkout fail?' }, golden],
        examples,
        {
          everyRecordedRound: true,
        }
      ).size
    ).toBe(2);
  });
});

describe('the ORCA goldens', () => {
  const goldens = readGoldens(goldensDirFor(ORCA_WRITEUP_RELEASE.name));

  it('cover every recorded round of every conversation, once', () => {
    const cases = new Set(goldens.map((g) => g.case_id));
    expect(cases.size).toBeGreaterThanOrEqual(4);
    for (const caseId of cases) {
      expect(caseId).toMatch(/^orca-/);
      const rounds = goldens.filter((g) => g.case_id === caseId).map((g) => g.round_index);
      expect(rounds.sort()).toEqual([...rounds.keys()]);
    }
  });
});
