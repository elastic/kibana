/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MlGetTrainedModelsStatsRequest,
  MlGetTrainedModelsRequest,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { MlTrainedModels } from '@kbn/ml-plugin/server';

import { MlModelDeploymentStatus, MlModelDeploymentState } from '../../../common/types/ml';

import { isNotFoundExceptionError } from './ml_model_deployment_common';

export const getMlModelDeploymentStatus = async (
  modelName: string,
  trainedModelsProvider: MlTrainedModels | undefined
): Promise<MlModelDeploymentStatus> => {
  if (!trainedModelsProvider) {
    throw new Error('Machine Learning is not enabled');
  }

  const modelDetailsRequest: MlGetTrainedModelsRequest = {
    include: 'definition_status',
    model_id: modelName,
  };

  // get the model details to see if we're downloaded...
  try {
    const modelDetailsResponse = await trainedModelsProvider.getTrainedModels(modelDetailsRequest);
    if (!modelDetailsResponse || modelDetailsResponse.count === 0) {
      // no model? return no status
      return getDefaultStatusReturn(MlModelDeploymentState.NotDeployed, modelName);
    }

    const firstTrainedModelConfig = modelDetailsResponse.trained_model_configs
      ? modelDetailsResponse.trained_model_configs[0]
      : undefined;

    // are we downloaded?
    if (!firstTrainedModelConfig || !firstTrainedModelConfig.fully_defined) {
      // we're still downloading...
      return getDefaultStatusReturn(MlModelDeploymentState.Downloading, modelName);
    }
  } catch (error) {
    if (!isNotFoundExceptionError(error)) {
      throw error;
    }
    // not found? return a default
    return getDefaultStatusReturn(MlModelDeploymentState.NotDeployed, modelName);
  }

  const modelRequest: MlGetTrainedModelsStatsRequest = {
    model_id: modelName,
  };

  const modelStatsResponse = await trainedModelsProvider.getTrainedModelsStats(modelRequest);
  if (
    !modelStatsResponse.trained_model_stats ||
    modelStatsResponse.trained_model_stats.length < 1 ||
    modelStatsResponse.trained_model_stats[0]?.deployment_stats === undefined
  ) {
    // if we're here - we're downloaded, but not deployed if we can't find the stats
    return getDefaultStatusReturn(MlModelDeploymentState.Downloaded, modelName);
  }

  const modelDeployment = modelStatsResponse.trained_model_stats[0].deployment_stats;

  return {
    deploymentState: getMlModelDeploymentStateForStatus(modelDeployment?.allocation_status.state),
    modelId: modelName,
    nodeAllocationCount: modelDeployment?.allocation_status.allocation_count || 0,
    startTime: modelDeployment?.start_time || 0,
    targetAllocationCount: modelDeployment?.allocation_status.target_allocation_count || 0,
    threadsPerAllocation: modelDeployment?.threads_per_allocation || 0,
  };
};

function getDefaultStatusReturn(
  status: MlModelDeploymentState,
  modelName: string
): MlModelDeploymentStatus {
  return {
    deploymentState: status,
    modelId: modelName,
    nodeAllocationCount: 0,
    startTime: 0,
    targetAllocationCount: 0,
    threadsPerAllocation: 0,
  };
}

function getMlModelDeploymentStateForStatus(state?: string): MlModelDeploymentState {
  if (!state) {
    return MlModelDeploymentState.NotDeployed;
  }

  switch (state) {
    case 'starting':
      return MlModelDeploymentState.Starting;
    case 'started':
      return MlModelDeploymentState.Started;
    case 'fully_allocated':
      return MlModelDeploymentState.FullyAllocated;
  }

  // unknown state? return default
  return MlModelDeploymentState.NotDeployed;
}
