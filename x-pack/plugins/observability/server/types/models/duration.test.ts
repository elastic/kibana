/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Duration, DurationUnit } from './duration';

describe('Duration', () => {
  it('throws when value is negative', () => {
    expect(() => new Duration(-1, DurationUnit.d)).toThrow('invalid duration value');
  });

  it('throws when value is zero', () => {
    expect(() => new Duration(0, DurationUnit.d)).toThrow('invalid duration value');
  });

  it('throws when unit is not valid', () => {
    expect(() => new Duration(1, 'z' as DurationUnit)).toThrow('invalid duration unit');
  });

  describe('isShorterThan', () => {
    it('returns true when the current duration is shorter than the other duration', () => {
      const short = new Duration(1, DurationUnit.m);
      expect(short.isShorterThan(new Duration(1, DurationUnit.h))).toBe(true);
      expect(short.isShorterThan(new Duration(1, DurationUnit.d))).toBe(true);
      expect(short.isShorterThan(new Duration(1, DurationUnit.w))).toBe(true);
      expect(short.isShorterThan(new Duration(1, DurationUnit.M))).toBe(true);
      expect(short.isShorterThan(new Duration(1, DurationUnit.Q))).toBe(true);
      expect(short.isShorterThan(new Duration(1, DurationUnit.Y))).toBe(true);
    });

    it('returns false when the current duration is longer (or equal) than the other duration', () => {
      const long = new Duration(1, DurationUnit.Y);
      expect(long.isShorterThan(new Duration(1, DurationUnit.m))).toBe(false);
      expect(long.isShorterThan(new Duration(1, DurationUnit.h))).toBe(false);
      expect(long.isShorterThan(new Duration(1, DurationUnit.d))).toBe(false);
      expect(long.isShorterThan(new Duration(1, DurationUnit.w))).toBe(false);
      expect(long.isShorterThan(new Duration(1, DurationUnit.M))).toBe(false);
      expect(long.isShorterThan(new Duration(1, DurationUnit.Q))).toBe(false);
      expect(long.isShorterThan(new Duration(1, DurationUnit.Y))).toBe(false);
    });
  });
});
