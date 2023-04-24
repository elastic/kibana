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
import { isNotFoundException, isResourceNotFoundException } from '../../utils/identify_exceptions';

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

    // are we downloaded?
    if (
      !modelDetailsResponse.trained_model_configs ||
      !modelDetailsResponse.trained_model_configs[0].fully_defined
    ) {
      // we're still downloading...
      return getDefaultStatusReturn(MlModelDeploymentState.Downloading, modelName);
    }
  } catch (error) {
    if (!isResourceNotFoundException(error)) {
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
    modelStatsResponse.trained_model_stats.length < 1
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
