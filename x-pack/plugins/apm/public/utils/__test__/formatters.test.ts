/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { asPercent, asTime } from '../formatters';

describe('formatters', () => {
  describe('asTime', () => {
    it('formats correctly with defaults', () => {
      expect(asTime(null)).toEqual('N/A');
      expect(asTime(undefined)).toEqual('N/A');
      expect(asTime(0)).toEqual('0 μs');
      expect(asTime(1)).toEqual('1 μs');
      expect(asTime(1000)).toEqual('1,000 μs');
      expect(asTime(1000 * 1000)).toEqual('1,000 ms');
      expect(asTime(1000 * 1000 * 10)).toEqual('10,000 ms');
      expect(asTime(1000 * 1000 * 20)).toEqual('20.0 s');
    });

    it('formats without unit', () => {
      expect(asTime(1000, { withUnit: false })).toEqual('1,000');
    });

    it('falls back to default value', () => {
      expect(asTime(undefined, { defaultValue: 'nope' })).toEqual('nope');
    });
  });

  describe('asPercent', () => {
    it('should divide and format item as percent', () => {
      expect(asPercent(3725, 10000, 'n/a')).toEqual('37.3%');
    });

    it('should format when numerator is 0', () => {
      expect(asPercent(0, 1, 'n/a')).toEqual('0.0%');
    });

    it('should return fallback when denominator is undefined', () => {
      expect(asPercent(3725, undefined, 'n/a')).toEqual('n/a');
    });

    it('should return fallback when denominator is 0 ', () => {
      expect(asPercent(3725, 0, 'n/a')).toEqual('n/a');
      expect(asPercent(3725, 0)).toEqual('');
    });
  });
});
