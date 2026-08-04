/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toAnomalyChartPoint } from './get_anomaly_timeseries';

describe('toAnomalyChartPoint', () => {
  const start = Date.parse('2026-07-17T11:08:00.000Z');
  const end = Date.parse('2026-07-17T11:22:00.000Z');

  it.each([
    {
      name: 'nulls score and actual when x is before start (off-canvas padded bucket)',
      // Repro from product-reviews: anomaly at 11:00 UTC with chart range 11:08–11:22 UTC
      input: {
        x: Date.parse('2026-07-17T11:00:00.000Z'),
        recordScore: 6.687902146770725,
        actual: 3010566.3988561598,
        divider: 1,
      },
      expected: {
        x: Date.parse('2026-07-17T11:00:00.000Z'),
        y: null,
        actual: null,
      },
    },
    {
      name: 'nulls score and actual when x is after end',
      input: {
        x: Date.parse('2026-07-17T11:30:00.000Z'),
        recordScore: 42,
        actual: 100,
        divider: 1,
      },
      expected: {
        x: Date.parse('2026-07-17T11:30:00.000Z'),
        y: null,
        actual: null,
      },
    },
    {
      name: 'keeps score and actual when x equals start',
      input: {
        x: start,
        recordScore: 6.69,
        actual: 3010566,
        divider: 1,
      },
      expected: {
        x: start,
        y: 6.69,
        actual: 3010566,
      },
    },
    {
      name: 'keeps score and actual when x equals end',
      input: {
        x: end,
        recordScore: 10,
        actual: 50,
        divider: 1,
      },
      expected: {
        x: end,
        y: 10,
        actual: 50,
      },
    },
    {
      name: 'keeps score and actual for points inside the selected range',
      input: {
        x: Date.parse('2026-07-17T11:15:00.000Z'),
        recordScore: 6.69,
        actual: 3010566,
        divider: 1,
      },
      expected: {
        x: Date.parse('2026-07-17T11:15:00.000Z'),
        y: 6.69,
        actual: 3010566,
      },
    },
    {
      name: 'applies the detector divider to actual values in range',
      input: {
        x: Date.parse('2026-07-17T11:15:00.000Z'),
        recordScore: 10,
        actual: 50,
        divider: 100,
      },
      expected: {
        x: Date.parse('2026-07-17T11:15:00.000Z'),
        y: 10,
        actual: 0.5,
      },
    },
    {
      name: 'normalizes null recordScore and actual to null when in range',
      input: {
        x: Date.parse('2026-07-17T11:15:00.000Z'),
        recordScore: null,
        actual: null,
        divider: 1,
      },
      expected: {
        x: Date.parse('2026-07-17T11:15:00.000Z'),
        y: null,
        actual: null,
      },
    },
    {
      name: 'normalizes undefined recordScore and actual to null when in range',
      input: {
        x: Date.parse('2026-07-17T11:15:00.000Z'),
        recordScore: undefined,
        actual: undefined,
        divider: 1,
      },
      expected: {
        x: Date.parse('2026-07-17T11:15:00.000Z'),
        y: null,
        actual: null,
      },
    },
  ])('$name', ({ input, expected }) => {
    expect(
      toAnomalyChartPoint({
        ...input,
        start,
        end,
      })
    ).toEqual(expected);
  });
});
