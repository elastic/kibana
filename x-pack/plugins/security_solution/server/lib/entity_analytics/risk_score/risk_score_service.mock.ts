/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RiskScoreService } from './risk_score_service';
import type { EntityRiskScoreRecord } from '../../../../common/api/entity_analytics/common';
import { EntityRiskLevelsEnum } from '../../../../common/api/entity_analytics/common';

const createRiskScoreMock = (
  overrides: Partial<EntityRiskScoreRecord> = {}
): EntityRiskScoreRecord => ({
  '@timestamp': '2023-02-15T00:15:19.231Z',
  id_field: 'host.name',
  id_value: 'hostname',
  calculated_level: EntityRiskLevelsEnum.High,
  calculated_score: 149,
  calculated_score_norm: 85.332,
  category_1_score: 85,
  category_1_count: 12,
  category_2_count: 0,
  category_2_score: 0,
  criticality_level: 'high_impact',
  criticality_modifier: 2,
  notes: [],
  inputs: [],
  ...overrides,
});

const createRiskScoreServiceMock = (): jest.Mocked<RiskScoreService> => ({
  calculateScores: jest.fn(),
  calculateAndPersistScores: jest.fn(),
  getConfigurationWithDefaults: jest.fn(),
  getRiskInputsIndex: jest.fn(),
  scheduleLatestTransformNow: jest.fn(),
  refreshRiskScoreIndex: jest.fn(),
});

export const riskScoreServiceMock = {
  create: createRiskScoreServiceMock,
  createRiskScore: createRiskScoreMock,
};
