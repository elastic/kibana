/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assertScoresWithinQueryLimit } from './score_budget';

describe('assertScoresWithinQueryLimit', () => {
  it('accepts a run whose scores the score API can return', () => {
    // One eighth of the public 755 (95 tasks), ORCA's 18 evaluators, one repetition.
    expect(() =>
      assertScoresWithinQueryLimit({ examples: 95, repetitions: 1, evaluators: 18 })
    ).not.toThrow();
    expect(() =>
      assertScoresWithinQueryLimit({ examples: 10_000, repetitions: 1, evaluators: 1 })
    ).not.toThrow();
  });

  it.each([
    ['the unsliced public 755', 755],
    ['a 1/1 slice of it', 755],
    ['one example over the limit', 556],
  ])('rejects %s before any investigation starts', (_name, examples) => {
    expect(() =>
      assertScoresWithinQueryLimit({ examples, repetitions: 1, evaluators: 18 })
    ).toThrow(/at most 555 examples/);
  });

  it('counts repetitions', () => {
    expect(() =>
      assertScoresWithinQueryLimit({ examples: 300, repetitions: 2, evaluators: 18 })
    ).toThrow(/10800 scores/);
  });
});
