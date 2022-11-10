/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { TrainedModelStat } from '@kbn/ml-plugin/common/types/trained_models';

import { Actions, createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export type GetMlModelsStatsArgs = undefined;

export interface GetMlModelsStatsResponse {
  count: number;
  trained_model_stats: TrainedModelStat[];
}

export const getMLModelsStats = async () => {
  return await HttpLogic.values.http.get<GetMlModelsStatsResponse>('/api/ml/trained_models/_stats');
};

export const MLModelsStatsApiLogic = createApiLogic(
  ['ml_models_stats_api_logic'],
  getMLModelsStats
);

export type MLModelsStatsApiLogicActions = Actions<GetMlModelsStatsArgs, GetMlModelsStatsResponse>;
