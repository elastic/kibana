/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MlGetTrainedModelsStatsResponse } from '@elastic/elasticsearch/lib/api/types';
import { MlGetTrainedModelsStatsRequest } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ElasticsearchClient } from '@kbn/core/server';

export const getMlModelDeploymentStats = async (
  modelName: string,
  esClient: ElasticsearchClient
): Promise<MlGetTrainedModelsStatsResponse> => {
  const modelRequest : MlGetTrainedModelsStatsRequest = {
    model_id: modelName,
  };
  return await esClient.ml.getTrainedModelsStats(modelRequest);
};
