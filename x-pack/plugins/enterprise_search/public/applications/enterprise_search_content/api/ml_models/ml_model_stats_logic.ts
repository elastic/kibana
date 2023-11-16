/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { MlTrainedModelStats } from '@elastic/elasticsearch/lib/api/types';

import { Actions, createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export type GetMlModelsStatsArgs = undefined;

export interface GetMlModelsStatsResponse {
  count: number;
  trained_model_stats: MlTrainedModelStats[];
}

export const getMLModelsStats = async () => {
  return await HttpLogic.values.http.get<GetMlModelsStatsResponse>(
    '/internal/ml/trained_models/_stats',
    { version: '1' }
  );
};

export const MLModelsStatsApiLogic = createApiLogic(
  ['ml_models_stats_api_logic'],
  getMLModelsStats,
  {
    clearFlashMessagesOnMakeRequest: false,
    showErrorFlash: false,
  }
);

export type MLModelsStatsApiLogicActions = Actions<GetMlModelsStatsArgs, GetMlModelsStatsResponse>;
