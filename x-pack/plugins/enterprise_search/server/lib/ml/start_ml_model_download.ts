/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MlPutTrainedModelRequest } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { MlTrainedModels } from '@kbn/ml-plugin/server';

import { MlModelDeploymentState, MlModelDeploymentStatus } from '../../../common/types/ml';

import { getMlModelDeploymentStatus } from './get_ml_model_deployment_status';
import { isNotFoundExceptionError } from './ml_model_deployment_common';

export const startMlModelDownload = async (
  modelName: string,
  trainedModelsProvider: MlTrainedModels | undefined
): Promise<MlModelDeploymentStatus> => {
  if (!trainedModelsProvider) {
    throw new Error('Machine Learning is not enabled');
  }

  try {
    // try and get the deployment status of the model first
    // and see if it's already deployed or deploying...
    const deploymentStatus = await getMlModelDeploymentStatus(modelName, trainedModelsProvider);
    const deploymentState = deploymentStatus?.deploymentState || MlModelDeploymentState.NotDeployed;

    // if we're downloading or already started / starting / done
    // return the status
    if (deploymentState !== MlModelDeploymentState.NotDeployed) {
      return deploymentStatus;
    }
  } catch (error) {
    // don't rethrow the not found here -
    // if it's not found there's a good chance it's not started
    // downloading yet
    if (!isNotFoundExceptionError(error)) {
      throw error;
    }
  }

  // we're not downloaded yet - let's initiate that...
  const putRequest: MlPutTrainedModelRequest = {
    body: {
      input: {
        field_names: ['text_field'],
      },
    },
    model_id: modelName,
  };

  // this will also sync our saved objects for us
  await trainedModelsProvider.putTrainedModel(putRequest);

  // and return our status
  return await getMlModelDeploymentStatus(modelName, trainedModelsProvider);
};
