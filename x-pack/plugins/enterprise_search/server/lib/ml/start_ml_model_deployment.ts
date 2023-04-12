/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MlStartTrainedModelDeploymentRequest } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ElasticsearchClient } from '@kbn/core/server';

import { MlModelDeploymentStatus } from '../../../common/types/ml';

import { isResourceNotFoundException } from '../../utils/identify_exceptions';

import { getMlModelDeploymentStatus } from './get_ml_model_deployment_status';

export const startMlModelDeployment = async (
  modelName: string,
  esClient: ElasticsearchClient
): Promise<MlModelDeploymentStatus> => {
  // try and get the deployment status of the model first
  // and see if it's already deployed or deploying...
  try {
    const deploymentStatus = await getMlModelDeploymentStatus(modelName, esClient);

    if (deploymentStatus && deploymentStatus.deploymentState) {
      return deploymentStatus;
    }
  } catch (error) {
    if (!isResourceNotFoundException(error)) {
      // if we could not find a deployment status, we can try and start
      // else some other error occured and we should bubble that up
      throw error;
    }
  }

  // not deployed yet - let's deploy it
  const startRequest: MlStartTrainedModelDeploymentRequest = {
    model_id: modelName,
    wait_for: 'starting',
  };

  await esClient.ml.startTrainedModelDeployment(startRequest);
  return await getMlModelDeploymentStatus(modelName, esClient);
};
