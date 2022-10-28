/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';

import { DeleteMlInferencePipelineResponse } from '../../../../../../common/types/pipelines';

import { detachMlInferencePipeline } from './detach_ml_inference_pipeline';

export const deleteMlInferencePipeline = async (
  indexName: string,
  pipelineName: string,
  client: ElasticsearchClient
) => {
  let response: DeleteMlInferencePipelineResponse = {};

  try {
    response = await detachMlInferencePipeline(indexName, pipelineName, client);
  } catch (error) {
    // only suppress Not Found error
    if (error.meta?.statusCode !== 404) {
      throw error;
    }
  }

  // finally, delete pipeline
  const deleteResponse = await client.ingest.deletePipeline({ id: pipelineName });
  if (deleteResponse.acknowledged === true) {
    response.deleted = pipelineName;
  }

  return response;
};
