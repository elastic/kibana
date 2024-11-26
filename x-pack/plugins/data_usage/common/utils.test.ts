/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateDateRangeWithinMinMax } from './utils';

describe('validateDateRangeWithinMinMax', () => {
  it.each([
    { start: 'now-1d', end: 'now' },
    { start: 'now-8d', end: 'now-1s' },
  ])(
    'should return true if the date range is within the min and max date range',
    ({ start, end }) => {
      expect(validateDateRangeWithinMinMax(start, end)).toBe(true);
    }
  );

  it.each([
    { start: 'now-10d', end: 'now' },
    { start: 'now-9d', end: 'now+2s' },
  ])(
    'should return false if the date range is not within the min and max date range',
    ({ start, end }) => {
      expect(validateDateRangeWithinMinMax(start, end)).toBe(false);
    }
  );
});
