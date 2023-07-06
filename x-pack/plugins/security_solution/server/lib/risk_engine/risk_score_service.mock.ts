/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RiskScoreService } from './risk_score_service';
import type { RiskScore } from './types';

const createRiskScoreMock = (overrides: Partial<RiskScore> = {}): RiskScore => ({
  '@timestamp': '2023-02-15T00:15:19.231Z',
  identifierField: 'host.name',
  identifierValue: 'hostname',
  level: 'High',
  totalScore: 149,
  totalScoreNormalized: 85.332,
  alertsScore: 85,
  otherScore: 0,
  notes: [],
  riskiestInputs: [],
  ...overrides,
});

const createRiskScoreServiceMock = (): jest.Mocked<RiskScoreService> => ({
  calculateScores: jest.fn(),
  calculateAndPersistScores: jest.fn(),
});

export const riskScoreServiceMock = {
  create: createRiskScoreServiceMock,
  createRiskScore: createRiskScoreMock,
};
