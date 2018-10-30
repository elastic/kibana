/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { asTime, asPercent } from '../formatters';

describe('formatters', () => {
  it('asTime', () => {
    expect(asTime(1000)).toBe('1 ms');
    expect(asTime(1000 * 1000)).toBe('1,000 ms');
    expect(asTime(1000 * 1000 * 10)).toBe('10,000 ms');
    expect(asTime(1000 * 1000 * 20)).toBe('20.0 s');
  });

  describe('asPercent', () => {
    it('should format item duration as percent', () => {
      expect(asPercent(3725, 10000, 'n/a')).toBe('37.25%');
    });

    it('should return fallback when totalDuration is 0 ', () => {
      expect(asPercent(3725, 0, 'n/a')).toBe('n/a');
      expect(asPercent(3725, 0)).toBe('');
    });

    it('should return fallback when totalDuration is undefined ', () => {
      expect(asPercent(3725, undefined, 'n/a')).toBe('n/a');
      expect(asPercent(3725)).toBe('');
    });
  });
});
