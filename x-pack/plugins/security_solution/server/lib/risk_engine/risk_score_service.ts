/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { CalculateScoresParams, CalculateScoresResponse } from './types';
import { calculateRiskScores } from './calculate_risk_scores';
import { calculateAndPersistRiskScores } from './calculate_and_persist_risk_scores';

export interface RiskScoreService {
  calculateScores: (params: CalculateScoresParams) => Promise<CalculateScoresResponse>;
  calculateAndPersistScores: (params: unknown) => Promise<unknown>;
}

export const riskScoreService = ({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): RiskScoreService => ({
  calculateScores: (params) => calculateRiskScores({ ...params, esClient, logger }),
  calculateAndPersistScores: (params) =>
    calculateAndPersistRiskScores({ params, esClient, logger }),
});
