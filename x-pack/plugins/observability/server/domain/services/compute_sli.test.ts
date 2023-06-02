/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { computeSLI } from './compute_sli';

describe('computeSLI', () => {
  it('returns -1 when no total events', () => {
    expect(computeSLI({ good: 100, total: 0 })).toEqual(-1);
  });

  it('returns the sli value', () => {
    expect(computeSLI({ good: 100, total: 1000 })).toEqual(0.1);
  });

  it('returns 1 when good is greater than total events', () => {
    expect(computeSLI({ good: 9999, total: 9 })).toEqual(1);
  });

  it('returns rounds the value to 6 digits', () => {
    expect(computeSLI({ good: 33, total: 90 })).toEqual(0.366667);
  });
});
