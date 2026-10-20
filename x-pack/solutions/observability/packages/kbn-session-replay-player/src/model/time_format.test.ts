/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatClock } from './time_format';

describe('formatClock', () => {
  it.each([
    [0, '0:00'],
    [999, '0:00'],
    [1_000, '0:01'],
    [65_000, '1:05'],
    [600_000, '10:00'],
    [3_599_999, '59:59'],
    [3_600_000, '1:00:00'],
    [3_725_000, '1:02:05'],
    [36_000_000, '10:00:00'],
  ])('formats %d ms as %s', (offsetMs, expected) => {
    expect(formatClock(offsetMs)).toBe(expected);
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])('formats %s as zero', (offsetMs) => {
    expect(formatClock(offsetMs)).toBe('0:00');
  });
});
