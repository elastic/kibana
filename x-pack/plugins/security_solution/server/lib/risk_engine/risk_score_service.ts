/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { GetScoresParams, GetScoresResponse } from './types';
import { calculateRiskScores } from './calculate_risk_scores';

export interface RiskScoreService {
  getScores: (params: GetScoresParams) => Promise<GetScoresResponse>;
}

export const buildRiskScoreService = ({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): RiskScoreService => ({
  getScores: (params) => calculateRiskScores({ ...params, esClient, logger }),
});
