/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DateRange } from '../models';
import { computeSLI } from './compute_sli';

const DATE_RANGE: DateRange = { from: new Date(), to: new Date() };
describe('computeSLI', () => {
  it('returns -1 when no total events', () => {
    expect(computeSLI({ good: 100, total: 0, dateRange: DATE_RANGE })).toEqual(-1);
  });

  it('returns the sli value', () => {
    expect(computeSLI({ good: 100, total: 1000, dateRange: DATE_RANGE })).toEqual(0.1);
  });

  it('returns 1 when good is greater than total events', () => {
    expect(computeSLI({ good: 9999, total: 9, dateRange: DATE_RANGE })).toEqual(1);
  });

  it('returns rounds the value to 6 digits', () => {
    expect(computeSLI({ good: 33, total: 90, dateRange: DATE_RANGE })).toEqual(0.366667);
  });
});
