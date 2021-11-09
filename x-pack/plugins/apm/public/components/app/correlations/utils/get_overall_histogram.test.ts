/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LatencyCorrelationsResponse } from '../../../../../common/correlations/latency_correlations/types';

import { getOverallHistogram } from './get_overall_histogram';

describe('getOverallHistogram', () => {
  it('returns "loading" when undefined and running', () => {
    const { overallHistogram, hasData, status } = getOverallHistogram(
      {} as LatencyCorrelationsResponse,
      true
    );
    expect(overallHistogram).toStrictEqual(undefined);
    expect(hasData).toBe(false);
    expect(status).toBe('loading');
  });

  it('returns "success" when undefined and not running', () => {
    const { overallHistogram, hasData, status } = getOverallHistogram(
      {} as LatencyCorrelationsResponse,
      false
    );
    expect(overallHistogram).toStrictEqual([]);
    expect(hasData).toBe(false);
    expect(status).toBe('success');
  });

  it('returns "success" when not undefined and still running', () => {
    const { overallHistogram, hasData, status } = getOverallHistogram(
      {
        overallHistogram: [{ key: 1, doc_count: 1234 }],
      } as LatencyCorrelationsResponse,
      true
    );
    expect(overallHistogram).toStrictEqual([{ key: 1, doc_count: 1234 }]);
    expect(hasData).toBe(true);
    expect(status).toBe('success');
  });

  it('returns "success" when not undefined and not running', () => {
    const { overallHistogram, hasData, status } = getOverallHistogram(
      {
        overallHistogram: [{ key: 1, doc_count: 1234 }],
      } as LatencyCorrelationsResponse,
      false
    );
    expect(overallHistogram).toStrictEqual([{ key: 1, doc_count: 1234 }]);
    expect(hasData).toBe(true);
    expect(status).toBe('success');
  });
});
