/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RiskCategories } from '../../../../common/entity_analytics/risk_engine';
import type { CalculateRiskScoreAggregations, RiskScoreBucket } from '../types';
import type { RiskScoresCalculationResponse } from '../../../../common/api/entity_analytics';
import type { EntityRiskScoreRecord } from '../../../../common/api/entity_analytics/common';
import { EntityRiskLevelsEnum } from '../../../../common/api/entity_analytics/common';

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
        risk_inputs: [
          {
            id: 'test_id',
            index: '_index',
            rule_name: 'Test rule',
            time: '2021-08-19T18:55:59.000Z',
            score: 30,
            contribution: 20,
          },
        ],
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
  overrides: Partial<RiskScoresCalculationResponse> = {}
): RiskScoresCalculationResponse => ({
  after_keys: { host: { 'host.name': 'hostname' } },
  scores: {
    host: [
      {
        '@timestamp': '2021-08-19T20:55:59.000Z',
        id_field: 'host.name',
        id_value: 'hostname',
        criticality_level: 'high_impact',
        criticality_modifier: 1.5,
        calculated_level: EntityRiskLevelsEnum.Unknown,
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
  errors: [],
  scores_written: 1,
  ...overrides,
});

const buildResponseWithOneScoreMock = () =>
  buildResponseMock({ scores: { host: [{} as EntityRiskScoreRecord] } });

export const calculateRiskScoresMock = {
  buildResponse: buildResponseMock,
  buildResponseWithOneScore: buildResponseWithOneScoreMock,
  buildAggregationResponse: buildAggregationResponseMock,
  buildRiskScoreBucket: buildRiskScoreBucketMock,
};
