/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Duration, DurationUnit } from './duration';

describe('Duration', () => {
  it('throws when value is negative', () => {
    expect(() => new Duration(-1, DurationUnit.Day)).toThrow('invalid duration value');
  });

  it('throws when value is zero', () => {
    expect(() => new Duration(0, DurationUnit.Day)).toThrow('invalid duration value');
  });

  it('throws when unit is not valid', () => {
    expect(() => new Duration(1, 'z' as DurationUnit)).toThrow('invalid duration unit');
  });

  describe('format', () => {
    it('formats the duration correctly', () => {
      expect(new Duration(1, DurationUnit.Minute).format()).toBe('1m');
      expect(new Duration(1, DurationUnit.Hour).format()).toBe('1h');
      expect(new Duration(1, DurationUnit.Day).format()).toBe('1d');
      expect(new Duration(1, DurationUnit.Week).format()).toBe('1w');
      expect(new Duration(1, DurationUnit.Month).format()).toBe('1M');
      expect(new Duration(1, DurationUnit.Quarter).format()).toBe('1Q');
      expect(new Duration(1, DurationUnit.Year).format()).toBe('1Y');
    });
  });

  describe('isShorterThan', () => {
    it('returns true when the current duration is shorter than the other duration', () => {
      const short = new Duration(1, DurationUnit.Minute);
      expect(short.isShorterThan(new Duration(1, DurationUnit.Hour))).toBe(true);
      expect(short.isShorterThan(new Duration(1, DurationUnit.Day))).toBe(true);
      expect(short.isShorterThan(new Duration(1, DurationUnit.Week))).toBe(true);
      expect(short.isShorterThan(new Duration(1, DurationUnit.Month))).toBe(true);
      expect(short.isShorterThan(new Duration(1, DurationUnit.Quarter))).toBe(true);
      expect(short.isShorterThan(new Duration(1, DurationUnit.Year))).toBe(true);
    });

    it('returns false when the current duration is longer (or equal) than the other duration', () => {
      const long = new Duration(1, DurationUnit.Year);
      expect(long.isShorterThan(new Duration(1, DurationUnit.Minute))).toBe(false);
      expect(long.isShorterThan(new Duration(1, DurationUnit.Hour))).toBe(false);
      expect(long.isShorterThan(new Duration(1, DurationUnit.Day))).toBe(false);
      expect(long.isShorterThan(new Duration(1, DurationUnit.Week))).toBe(false);
      expect(long.isShorterThan(new Duration(1, DurationUnit.Month))).toBe(false);
      expect(long.isShorterThan(new Duration(1, DurationUnit.Quarter))).toBe(false);
      expect(long.isShorterThan(new Duration(1, DurationUnit.Year))).toBe(false);
    });
  });
});
