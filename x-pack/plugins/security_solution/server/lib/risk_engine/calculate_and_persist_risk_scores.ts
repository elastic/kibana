/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';

import type { RiskEngineDataClient } from './risk_engine_data_client';
import type { CalculateAndPersistScoresParams, CalculateAndPersistScoresResponse } from './types';
import { calculateRiskScores } from './calculate_risk_scores';

export const calculateAndPersistRiskScores = async (
  params: CalculateAndPersistScoresParams & {
    esClient: ElasticsearchClient;
    logger: Logger;
    spaceId: string;
    riskEngineDataClient: RiskEngineDataClient;
  }
): Promise<CalculateAndPersistScoresResponse> => {
  const { riskEngineDataClient, spaceId, ...rest } = params;
  const writer = await riskEngineDataClient.getWriter({
    namespace: spaceId,
  });
  const { after_keys: afterKeys, scores } = await calculateRiskScores(rest);

  if (!scores.host?.length && !scores.user?.length) {
    return { after_keys: {}, errors: [], scores_written: 0 };
  }

  const { errors, docs_written: scoresWritten } = await writer.bulk(scores);

  return { after_keys: afterKeys, errors, scores_written: scoresWritten };
};
