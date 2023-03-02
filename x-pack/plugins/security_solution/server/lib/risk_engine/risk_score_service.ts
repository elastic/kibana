/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { FullRiskScore, GetScoresParams, SimpleRiskScore } from './types';
import { calculateRiskScores } from './calculate_risk_scores';

export interface RiskScoreService {
  getScores: (params: GetScoresParams) => Promise<SimpleRiskScore[] | FullRiskScore[]>;
}

export const buildRiskScoreService = ({
  esClient,
}: {
  esClient: ElasticsearchClient;
}): RiskScoreService => ({
  getScores: (params) => calculateRiskScores({ ...params, esClient }),
});
