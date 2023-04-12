/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MlGetTrainedModelsStatsRequest } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ElasticsearchClient } from '@kbn/core/server';

import { MlModelDeploymentStatus } from '../../../common/types/ml';

import { ElasticsearchResponseError } from '../../utils/identify_exceptions';

export const getMlModelDeploymentStatus = async (
  modelName: string,
  esClient: ElasticsearchClient
): Promise<MlModelDeploymentStatus> => {
  const modelRequest: MlGetTrainedModelsStatsRequest = {
    model_id: modelName,
  };
  const modelStatsResponse = await esClient.ml.getTrainedModelsStats(modelRequest);
  if (
    !modelStatsResponse.trained_model_stats ||
    modelStatsResponse.trained_model_stats.length < 1
  ) {
    const notFoundError: ElasticsearchResponseError = {
      meta: {
        statusCode: 404,
      },
      name: 'ResponseError',
    };
    throw notFoundError;
  }

  const modelDeployment = modelStatsResponse.trained_model_stats[0].deployment_stats;

  return {
    deploymentState: modelDeployment?.allocation_status.state || '',
    modelId: modelName,
    nodeAllocationCount: modelDeployment?.allocation_status.allocation_count || 0,
    startTime: modelDeployment?.start_time || 0,
    targetAllocationCount: modelDeployment?.allocation_status.target_allocation_count || 0,
  };
};
