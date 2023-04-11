/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MlStartTrainedModelDeploymentResponse } from '@elastic/elasticsearch/lib/api/types';
import { MlStartTrainedModelDeploymentRequest } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ElasticsearchClient } from '@kbn/core/server';

export const startMlModelDeployment = async (
  modelName: string,
  esClient: ElasticsearchClient
): Promise<MlStartTrainedModelDeploymentResponse> => {
  // is the model already deployed and complete?

  // are we in the process of deploying it?

  // not deployed yet - let's deploy it
  const startRequest: MlStartTrainedModelDeploymentRequest = {
    model_id: modelName,
    wait_for: 'starting',
  };

  return await esClient.ml.startTrainedModelDeployment(startRequest);
};
