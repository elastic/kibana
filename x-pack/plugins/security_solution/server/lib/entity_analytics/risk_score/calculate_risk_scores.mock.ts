/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RiskCategories, RiskLevels } from '../../../../common/entity_analytics/risk_engine';
import type { RiskScore } from '../../../../common/entity_analytics/risk_engine';
import type {
  CalculateRiskScoreAggregations,
  CalculateScoresResponse,
  RiskScoreBucket,
} from '../types';

const buildRiskScoreBucketMock = (overrides: Partial<RiskScoreBucket> = {}): RiskScoreBucket => ({
  key: { 'user.name': 'username' },
  doc_count: 2,
  top_inputs: {
    risk_details: {
      value: {
        score: 20,
        normalized_score: 30.0,
        notes: [],
        category_1_score: 30,
        category_1_count: 1,
        risk_inputs: [],
      },
    },
    doc_count: 2,
  },
  ...overrides,
});

const buildAggregationResponseMock = (
  overrides: Partial<CalculateRiskScoreAggregations> = {}
): CalculateRiskScoreAggregations => ({
  host: {
    after_key: { 'host.name': 'hostname' },
    buckets: [
      buildRiskScoreBucketMock({ key: { 'host.name': 'hostname' } }),
      buildRiskScoreBucketMock({ key: { 'host.name': 'hostname' } }),
    ],
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
  scores: {
    host: [
      {
        '@timestamp': '2021-08-19T20:55:59.000Z',
        id_field: 'host.name',
        id_value: 'hostname',
        criticality_level: 'high_impact',
        criticality_modifier: 1.5,
        calculated_level: RiskLevels.unknown,
        calculated_score: 20,
        calculated_score_norm: 30,
        category_1_score: 30,
        category_1_count: 12,
        category_2_score: 0,
        category_2_count: 0,
        notes: [],
        inputs: [
          {
            id: '_id',
            index: '_index',
            category: RiskCategories.category_1,
            description: 'Alert from Rule: My rule',
            risk_score: 30,
            timestamp: '2021-08-19T18:55:59.000Z',
            contribution_score: 20,
          },
        ],
      },
    ],
    user: [],
  },
  ...overrides,
});

const buildResponseWithOneScoreMock = () =>
  buildResponseMock({ scores: { host: [{} as RiskScore] } });

export const calculateRiskScoresMock = {
  buildResponse: buildResponseMock,
  buildResponseWithOneScore: buildResponseWithOneScoreMock,
  buildAggregationResponse: buildAggregationResponseMock,
  buildRiskScoreBucket: buildRiskScoreBucketMock,
};
