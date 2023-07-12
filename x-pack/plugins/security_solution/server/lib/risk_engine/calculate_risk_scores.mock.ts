/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CalculateRiskScoreAggregations,
  CalculateScoresResponse,
  RiskScoreBucket,
} from './types';

const buildRiskScoreBucketMock = (overrides: Partial<RiskScoreBucket> = {}): RiskScoreBucket => ({
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

const buildAggregationResponseMock = (
  overrides: Partial<CalculateRiskScoreAggregations> = {}
): CalculateRiskScoreAggregations => ({
  host: {
    after_key: { 'host.name': 'hostname' },
    buckets: [buildRiskScoreBucketMock(), buildRiskScoreBucketMock()],
  },
  user: {
    after_key: { 'user.name': 'username' },
    buckets: [buildRiskScoreBucketMock(), buildRiskScoreBucketMock()],
  },
  ...overrides,
});

const buildResponseMock = (
  overrides: Partial<CalculateScoresResponse> = {}
): CalculateScoresResponse => ({
  after_keys: { host: { 'host.name': 'hostname' } },
  scores: [
    {
      '@timestamp': '2021-08-19T20:55:59.000Z',
      identifierField: 'host.name',
      identifierValue: 'hostname',
      level: 'Unknown',
      totalScore: 20,
      totalScoreNormalized: 30,
      alertsScore: 30,
      otherScore: 0,
      notes: [],
      riskiestInputs: [
        {
          id: '_id',
          index: '_index',
          riskScore: 30,
        },
      ],
    },
  ],
  ...overrides,
});

export const calculateRiskScoreMock = {
  buildResponse: buildResponseMock,
  buildAggregationResponse: buildAggregationResponseMock,
  buildRiskScoreBucket: buildRiskScoreBucketMock,
};
