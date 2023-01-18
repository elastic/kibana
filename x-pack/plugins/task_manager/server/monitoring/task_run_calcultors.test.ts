/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuid } from 'uuid';

import {
  calculateRunningAverage,
  calculateFrequency,
  createRunningAveragedStat,
  createMapOfRunningAveragedStats,
} from './task_run_calcultors';

describe('calculateRunningAverage', () => {
  test('calculates the running average and median of a window of values', async () => {
    expect(calculateRunningAverage([2, 2, 4, 6, 6])).toMatchInlineSnapshot(`
      Object {
        "p50": 4,
        "p90": 6,
        "p95": 6,
        "p99": 6,
      }
    `);
  });
});

describe('calculateFrequency', () => {
  test('calculates the frequency of each terms in the list as a percentage', async () => {
    const [term1, term2, term3] = [uuid(), uuid(), uuid()];
    expect(
      calculateFrequency([term1, term2, term2, term3, term1, term1, term2, term1, term3])
    ).toEqual({
      [term3]: 22,
      [term1]: 44,
      [term2]: 33,
    });
  });
});

describe('createRunningAveragedStat', () => {
  test('create a function which tracks a window of values', async () => {
    const queue = createRunningAveragedStat(3);
    expect(queue(1)).toEqual([1]);
    expect(queue(2)).toEqual([1, 2]);
    expect(queue(3)).toEqual([1, 2, 3]);
    expect(queue(4)).toEqual([2, 3, 4]);
    expect(queue(5)).toEqual([3, 4, 5]);
  });
});

describe('createMapOfRunningAveragedStats', () => {
  test('create a function which tracks multiple window of values by key', async () => {
    const [term1, term2, term3] = [uuid(), uuid(), uuid()];
    const mappedQueues = createMapOfRunningAveragedStats(3);
    expect(mappedQueues(term1, 1)).toEqual({ [term1]: [1] });
    expect(mappedQueues(term1, 2)).toEqual({ [term1]: [1, 2] });
    expect(mappedQueues(term2, 3)).toEqual({ [term1]: [1, 2], [term2]: [3] });
    expect(mappedQueues(term3, 4)).toEqual({ [term1]: [1, 2], [term2]: [3], [term3]: [4] });
    expect(mappedQueues(term2, 5)).toEqual({ [term1]: [1, 2], [term2]: [3, 5], [term3]: [4] });
    expect(mappedQueues(term2, 6)).toEqual({ [term1]: [1, 2], [term2]: [3, 5, 6], [term3]: [4] });
    expect(mappedQueues(term1, 7)).toEqual({
      [term1]: [1, 2, 7],
      [term2]: [3, 5, 6],
      [term3]: [4],
    });
    expect(mappedQueues(term1, 8)).toEqual({
      [term1]: [2, 7, 8],
      [term2]: [3, 5, 6],
      [term3]: [4],
    });
    expect(mappedQueues(term1, 9)).toEqual({
      [term1]: [7, 8, 9],
      [term2]: [3, 5, 6],
      [term3]: [4],
    });
  });
});
