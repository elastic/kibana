/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { asPercent, asTime } from '../formatters';

describe('formatters', () => {
  describe('asTime', () => {
    it('formats correctly with defaults', () => {
      expect(asTime(null)).toBe('N/A');
      expect(asTime(undefined)).toBe('N/A');
      expect(asTime(0)).toBe('0 μs');
      expect(asTime(1)).toBe('1 μs');
      expect(asTime(1000)).toBe('1,000 μs');
      expect(asTime(1000 * 1000)).toBe('1,000 ms');
      expect(asTime(1000 * 1000 * 10)).toBe('10,000 ms');
      expect(asTime(1000 * 1000 * 20)).toBe('20.0 s');
    });

    it('formats without unit', () => {
      expect(asTime(1000, { withUnit: false })).toBe('1,000');
    });

    it('formats without unit', () => {
      expect(asTime(undefined, { defaultValue: 'nope' })).toBe('nope');
    });
  });

  describe('asPercent', () => {
    it('should format item as percent', () => {
      expect(asPercent(3725, 10000, 'n/a')).toBe('37.25%');
    });

    it('should return fallback when denominator is 0 ', () => {
      expect(asPercent(3725, 0, 'n/a')).toBe('n/a');
      expect(asPercent(3725, 0)).toBe('');
    });

    it('should return fallback when denominator is undefined ', () => {
      expect(asPercent(3725, undefined, 'n/a')).toBe('n/a');
      expect(asPercent(3725)).toBe('');
    });
  });
});
