/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applyCriticalityToScore, normalize } from './helpers';

describe('applyCriticalityToScore', () => {
  describe('integer scores', () => {
    it('returns the original score if the modifier is undefined', () => {
      const result = applyCriticalityToScore({ modifier: undefined, score: 90 });
      expect(result).toEqual(90);
    });

    it('returns the original score if the modifier is 1', () => {
      const result = applyCriticalityToScore({ modifier: 1, score: 90 });
      expect(result).toEqual(90);
    });

    it('returns an increased score if the modifier is greater than 1', () => {
      const result = applyCriticalityToScore({ modifier: 1.5, score: 90 });
      expect(result).toEqual(93.10344827586206);
    });

    it('returns a decreased score if the modifier is less than 1', () => {
      const result = applyCriticalityToScore({ modifier: 0.5, score: 90 });
      expect(result).toEqual(81.81818181818181);
    });

    it('does not exceed a score of 100 with a previous score of 99 and a large modifier', () => {
      const result = applyCriticalityToScore({ modifier: 200, score: 99 });
      expect(result).toEqual(99.99494975001262);
    });
  });

  describe('non-integer scores', () => {
    it('returns the original score if the modifier is undefined', () => {
      const result = applyCriticalityToScore({ modifier: undefined, score: 90.5 });
      expect(result).toEqual(90.5);
    });

    it('returns the original score if the modifier is 1', () => {
      const result = applyCriticalityToScore({ modifier: 1, score: 91.84 });
      expect(result).toEqual(91.84);
    });
    it('returns an increased score if the modifier is greater than 1', () => {
      const result = applyCriticalityToScore({ modifier: 1.5, score: 75.98 });
      expect(result).toEqual(82.59294151750127);
    });

    it('returns a decreased score if the modifier is less than 1', () => {
      const result = applyCriticalityToScore({ modifier: 0.5, score: 44.12 });
      expect(result).toEqual(28.303823453938925);
    });

    it('does not exceed a score of 100 with a high previous score and a large modifier', () => {
      const result = applyCriticalityToScore({ modifier: 200, score: 99.88 });
      expect(result).toEqual(99.9993992827436);
    });
  });
});

describe('normalize', () => {
  it('returns 0 if the number is equal to the min', () => {
    const result = normalize({ number: 0, min: 0, max: 100 });
    expect(result).toEqual(0);
  });

  it('returns 100 if the number is equal to the max', () => {
    const result = normalize({ number: 100, min: 0, max: 100 });
    expect(result).toEqual(100);
  });

  it('returns 50 if the number is halfway between the min and max', () => {
    const result = normalize({ number: 50, min: 0, max: 100 });
    expect(result).toEqual(50);
  });

  it('defaults to a min of 0', () => {
    const result = normalize({ number: 50, max: 100 });
    expect(result).toEqual(50);
  });

  describe('when the domain is diffrent than the range', () => {
    it('returns 0 if the number is equal to the min', () => {
      const result = normalize({ number: 20, min: 20, max: 200 });
      expect(result).toEqual(0);
    });

    it('returns 100 if the number is equal to the max', () => {
      const result = normalize({ number: 40, min: 30, max: 40 });
      expect(result).toEqual(100);
    });

    it('returns 50 if the number is halfway between the min and max', () => {
      const result = normalize({ number: 20, min: 0, max: 40 });
      expect(result).toEqual(50);
    });
  });
});
