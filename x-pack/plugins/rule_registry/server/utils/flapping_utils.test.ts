/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { atCapacity, updateFlappingHistory, getCapcityDiff, isFlapping } from './flapping_utils';

describe('updateFlappingHistory function', () => {
  test('correctly updates flappingHistory', () => {
    const flappingHistory = updateFlappingHistory([false, false], true);
    expect(flappingHistory).toEqual([false, false, true]);
  });

  test('correctly updates flappingHistory while maintaining a fixed size', () => {
    const flappingHistory = new Array(20).fill(false);
    const fh = updateFlappingHistory(flappingHistory, true);
    expect(fh.length).toEqual(20);
    expect(fh).toEqual([
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      true,
    ]);
  });

  test('correctly updates flappingHistory while maintaining if array is larger than fixed size', () => {
    const flappingHistory = new Array(23).fill(false);
    const fh = updateFlappingHistory(flappingHistory, true);
    expect(fh.length).toEqual(20);
    expect(fh).toEqual([
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      true,
    ]);
  });
});

describe('atCapacity and getCapcityDiff functions', () => {
  test('returns true if flappingHistory == set capacity', () => {
    const flappingHistory = new Array(20).fill(false);
    expect(atCapacity(flappingHistory)).toEqual(true);
    expect(getCapcityDiff(flappingHistory)).toEqual(1);
  });

  test('returns true if flappingHistory > set capacity', () => {
    const flappingHistory = new Array(25).fill(false);
    expect(atCapacity(flappingHistory)).toEqual(true);
    expect(getCapcityDiff(flappingHistory)).toEqual(6);
  });

  test('returns false if flappingHistory < set capacity', () => {
    const flappingHistory = new Array(15).fill(false);
    expect(atCapacity(flappingHistory)).toEqual(false);
  });
});

describe('isFlapping', () => {
  test('returns true if at capacity and flap count exceeds the threshold', () => {
    const flappingHistory = [true, true, true, true].concat(new Array(16).fill(false));
    expect(isFlapping(flappingHistory)).toEqual(true);
  });

  test("returns false if at capacity and flap count doesn't exceed the threshold", () => {
    const flappingHistory = [true, true].concat(new Array(20).fill(false));
    expect(isFlapping(flappingHistory)).toEqual(false);
  });

  test('returns false if not at capacity', () => {
    const flappingHistory = new Array(5).fill(true);
    expect(isFlapping(flappingHistory)).toEqual(false);
  });
});
