/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { computeExpectationsAndRanges } from './aggregation_utils';

describe('aggregation utils', () => {
  describe('computeExpectationsAndRanges()', () => {
    it('returns expectations and ranges based on given percentiles #1', async () => {
      const { expectations, ranges } = computeExpectationsAndRanges([0, 1]);
      expect(expectations).toEqual([0, 0.5, 1]);
      expect(ranges).toEqual([{ to: 0 }, { from: 0, to: 1 }, { from: 1 }]);
    });
    it('returns expectations and ranges based on given percentiles #2', async () => {
      const { expectations, ranges } = computeExpectationsAndRanges([1, 3, 5]);
      expect(expectations).toEqual([1, 2, 4, 5]);
      expect(ranges).toEqual([
        { to: 1 },
        { from: 1, to: 3 },
        { from: 3, to: 5 },
        { from: 5 },
      ]);
    });
    it('returns expectations and ranges with adjusted fractions', async () => {
      const { expectations, ranges } = computeExpectationsAndRanges([
        1,
        3,
        3,
        5,
      ]);
      expect(expectations).toEqual([
        1,
        2.333333333333333,
        3.666666666666667,
        5,
      ]);
      expect(ranges).toEqual([
        { to: 1 },
        { from: 1, to: 3 },
        { from: 3, to: 3 },
        { from: 3, to: 5 },
        { from: 5 },
      ]);
    });
  });
});
