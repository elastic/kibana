/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { checkHoldout, holdoutReward } from './holdout';
import type { RunSummary, TaskRun } from './runner';

const run = (seedId: string, reward: number | null, executionSuccess = true): TaskRun =>
  ({ seedId, caseId: seedId, reward, executionSuccess, costUsd: 0.5, rollout: 0 } as TaskRun);

const summary = (hash: string, runs: TaskRun[]): RunSummary =>
  ({
    configHash: hash,
    runs,
    meanReward:
      runs.filter((r) => r.reward !== null).reduce((t, r) => t + (r.reward as number), 0) /
      runs.length,
    executionSuccessRate: runs.filter((r) => r.executionSuccess).length / runs.length,
    totalCostUsd: runs.length * 0.5,
  } as RunSummary);

describe('holdoutReward', () => {
  it('averages goal and cause, zeroes leakage, and is unscored without an answer', () => {
    expect(holdoutReward({ goalPass: 1, causeCompleteness: 0.5, leaked: false })).toBe(0.75);
    expect(holdoutReward({ goalPass: 1, causeCompleteness: 1, leaked: true })).toBe(0);
    expect(holdoutReward({ goalPass: 0, causeCompleteness: null, leaked: false })).toBeNull();
  });
});

describe('checkHoldout', () => {
  const seeds = Array.from({ length: 10 }, (unused, i) => `c${i}`);

  it('passes an unchanged candidate', () => {
    const runs = seeds.map((seed, i) => run(seed, i % 2 ? 1 : 0.25));
    expect(
      checkHoldout({ incumbent: summary('a', runs), candidate: summary('b', runs) }).passed
    ).toBe(true);
  });

  it('fails a candidate that is clearly worse', () => {
    const result = checkHoldout({
      incumbent: summary(
        'a',
        seeds.map((seed) => run(seed, 0.9))
      ),
      candidate: summary(
        'b',
        seeds.map((seed) => run(seed, 0.4))
      ),
    });
    expect(result.passed).toBe(false);
    expect(result.reasons[0]).toMatch(/CI low/);
  });

  it('fails when two more incidents end without an answer', () => {
    const result = checkHoldout({
      incumbent: summary(
        'a',
        seeds.map((seed) => run(seed, 0.5))
      ),
      candidate: summary(
        'b',
        seeds.map((seed, i) => (i < 2 ? run(seed, null, false) : run(seed, 0.5)))
      ),
    });
    expect(result.passed).toBe(false);
    expect(result.reasons.join()).toMatch(/execution success/);
  });
});
