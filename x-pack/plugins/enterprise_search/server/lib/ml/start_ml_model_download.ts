/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MlPutTrainedModelRequest } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { MlTrainedModels } from '@kbn/ml-plugin/server';
import { MlClient } from '@kbn/ml-plugin/server/lib/ml_client';

import { MlModelDeploymentState, MlModelDeploymentStatus } from '../../../common/types/ml';
import {
  ElasticsearchResponseError,
  isResourceNotFoundException,
} from '../../utils/identify_exceptions';

import { getMlModelDeploymentStatus } from './get_ml_model_deployment_status';
import { acceptableModelNames } from './start_ml_model_deployment';

export const startMlModelDownload = async (
  modelName: string,
  mlClient: MlClient | undefined,
  trainedModelsProvider: MlTrainedModels | undefined
): Promise<MlModelDeploymentStatus> => {
  if (!trainedModelsProvider || !mlClient) {
    throw new Error('Machine Learning is not enabled');
  }

  let deploymentState: MlModelDeploymentState = MlModelDeploymentState.NotDeployed;

  // before anything else, check our model name
  // to ensure we only allow those names we want
  if (!acceptableModelNames.includes(modelName)) {
    const notFoundError: ElasticsearchResponseError = {
      meta: {
        statusCode: 404,
      },
      name: 'ResponseError',
    };
    throw notFoundError;
  }

  try {
    // try and get the deployment status of the model first
    // and see if it's already deployed or deploying...
    const deploymentStatus = await getMlModelDeploymentStatus(modelName, trainedModelsProvider);

    deploymentState = deploymentStatus?.deploymentState || MlModelDeploymentState.NotDeployed;

    // if we're downloading or already started / starting / done
    // return the status
    if (deploymentState !== MlModelDeploymentState.NotDeployed) {
      return deploymentStatus;
    }
  } catch (error) {
    // don't rethrow the not found here -
    // if it's not found there's a good chance it's not started
    // downloading yet
    if (!isResourceNotFoundException(error)) {
      throw error;
    }
  }

  // we're not downloaded yet - let's initiate that...
  const putRequest: MlPutTrainedModelRequest = {
    body: {
      inference_config: {},
      input: {
        field_names: ['text_field'],
      },
    },
    model_id: modelName,
  };

  // this will also sync our saved objects for us
  await mlClient.putTrainedModel(putRequest);

  // and return our status
  return await getMlModelDeploymentStatus(modelName, trainedModelsProvider);
};
