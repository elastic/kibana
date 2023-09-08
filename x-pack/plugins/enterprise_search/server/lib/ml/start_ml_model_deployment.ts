/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MlStartTrainedModelDeploymentRequest } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { MlTrainedModels } from '@kbn/ml-plugin/server';

import { MlModelDeploymentStatus, MlModelDeploymentState } from '../../../common/types/ml';

import { getMlModelDeploymentStatus } from './get_ml_model_deployment_status';
import {
  isNotFoundExceptionError,
  throwIfNotAcceptableModelName,
} from './ml_model_deployment_common';

export const startMlModelDeployment = async (
  modelName: string,
  trainedModelsProvider: MlTrainedModels | undefined
): Promise<MlModelDeploymentStatus> => {
  if (!trainedModelsProvider) {
    throw new Error('Machine Learning is not enabled');
  }

  // before anything else, check our model name
  // to ensure we only allow those names we want
  throwIfNotAcceptableModelName(modelName);

  try {
    // try and get the deployment status of the model first
    // and see if it's already deployed or deploying...
    const deploymentStatus = await getMlModelDeploymentStatus(modelName, trainedModelsProvider);
    const deploymentState = deploymentStatus?.deploymentState || MlModelDeploymentState.NotDeployed;

    // if we're not just "downloaded", return the current status
    if (deploymentState !== MlModelDeploymentState.Downloaded) {
      return deploymentStatus;
    }
  } catch (error) {
    // don't rethrow the not found here - if it's not found there's
    // a good chance it's not started downloading yet
    if (!isNotFoundExceptionError(error)) {
      throw error;
    }
  }

  // we're downloaded already, but not deployed yet - let's deploy it
  const startRequest: MlStartTrainedModelDeploymentRequest = {
    model_id: modelName,
    wait_for: 'started',
  };

  await trainedModelsProvider.startTrainedModelDeployment(startRequest);
  return await getMlModelDeploymentStatus(modelName, trainedModelsProvider);
};
