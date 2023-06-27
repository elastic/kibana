/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CalculateRiskScoreAggregations, RiskScoreBucket } from './types';

const createRiskScoreBucketMock = (overrides: Partial<RiskScoreBucket> = {}): RiskScoreBucket => ({
  key: { 'user.name': 'username', category: 'alert' },
  doc_count: 2,
  risk_details: {
    value: {
      score: 20,
      normalized_score: 30.0,
      level: 'Unknown',
      notes: [],
      alerts_score: 30,
      other_score: 0,
    },
  },
  riskiest_inputs: {
    took: 17,
    timed_out: false,
    _shards: {
      total: 1,
      successful: 1,
      skipped: 0,
      failed: 0,
    },
    hits: {
      total: {
        value: 1,
        relation: 'eq',
      },
      hits: [{ _id: '_id', _index: '_index', sort: [30] }],
    },
  },

  ...overrides,
});

const createAggregationResponseMock = (
  overrides: Partial<CalculateRiskScoreAggregations> = {}
): CalculateRiskScoreAggregations => ({
  host: {
    after_key: { 'host.name': 'hostname' },
    buckets: [createRiskScoreBucketMock(), createRiskScoreBucketMock()],
  },
  user: {
    after_key: { 'user.name': 'username' },
    buckets: [createRiskScoreBucketMock(), createRiskScoreBucketMock()],
  },
  ...overrides,
});

export const calculateRiskScoreMock = {
  createAggregationResponse: createAggregationResponseMock,
  createRiskScoreBucket: createRiskScoreBucketMock,
};
