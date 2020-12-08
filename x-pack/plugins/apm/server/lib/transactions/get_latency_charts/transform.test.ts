/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { timeseriesResponse } from './mock_response/timeseries_response';
import { convertLatencyBucketsToCoordinates } from './transform';

describe('convertLatencyBucketsToCoordinates', () => {
  it('returns default value when latency buckets is undefined', () => {
    const latency = convertLatencyBucketsToCoordinates();
    expect(latency).toEqual({ avg: [], p95: [], p99: [] });
  });

  it('returns latecy coordinates', () => {
    const latency = convertLatencyBucketsToCoordinates(
      timeseriesResponse.aggregations?.latency.buckets
    );
    expect(latency).toEqual({
      avg: [
        { x: 1607346030000, y: 13942 },
        { x: 1607346060000, y: 19322.333333333332 },
        { x: 1607346090000, y: null },
        { x: 1607346120000, y: 68323.875 },
        { x: 1607346150000, y: 25222877.333333332 },
        { x: 1607346180000, y: null },
        { x: 1607346210000, y: null },
        { x: 1607346240000, y: 29134 },
        { x: 1607346270000, y: 9837 },
      ],
      p95: [
        { x: 1607346030000, y: 13888 },
        { x: 1607346060000, y: 23552 },
        { x: 1607346090000, y: null },
        { x: 1607346120000, y: 378864 },
        { x: 1607346150000, y: 73924480 },
        { x: 1607346180000, y: null },
        { x: 1607346210000, y: null },
        { x: 1607346240000, y: 38016 },
        { x: 1607346270000, y: 9792 },
      ],
      p99: [
        { x: 1607346030000, y: 13888 },
        { x: 1607346060000, y: 23552 },
        { x: 1607346090000, y: null },
        { x: 1607346120000, y: 378864 },
        { x: 1607346150000, y: 73924480 },
        { x: 1607346180000, y: null },
        { x: 1607346210000, y: null },
        { x: 1607346240000, y: 38016 },
        { x: 1607346270000, y: 9792 },
      ],
    });
  });
});
