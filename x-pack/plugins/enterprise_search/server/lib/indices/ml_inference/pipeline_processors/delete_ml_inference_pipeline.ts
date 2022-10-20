/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IngestPutPipelineRequest } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient } from '@kbn/core/server';

import { getInferencePipelineNameFromIndexName } from '../../../../utils/ml_inference_pipeline_utils';

/**
 * Response for deleting sub-pipeline from @ml-inference pipeline.
 * If sub-pipeline was deleted successfully, 'deleted' field contains its name.
 * If parent pipeline was updated successfully, 'updated' field contains its name.
 */
export interface DeleteMlInferencePipelineResponse {
  deleted?: string;
  updated?: string;
}

export const deleteMlInferencePipeline = async (
  indexName: string,
  pipelineName: string,
  client: ElasticsearchClient
) => {
  const response: DeleteMlInferencePipelineResponse = {};
  const parentPipelineId = getInferencePipelineNameFromIndexName(indexName);

  // find parent pipeline
  try {
    const pipelineResponse = await client.ingest.getPipeline({
      id: parentPipelineId,
    });

    const parentPipeline = pipelineResponse[parentPipelineId];

    if (parentPipeline !== undefined) {
      // remove sub-pipeline from parent pipeline
      if (parentPipeline.processors !== undefined) {
        const updatedProcessors = parentPipeline.processors.filter(
          (p) => !(p.pipeline !== undefined && p.pipeline.name === pipelineName)
        );
        // only update if we changed something
        if (updatedProcessors.length !== parentPipeline.processors.length) {
          const updatedPipeline: IngestPutPipelineRequest = {
            ...parentPipeline,
            id: parentPipelineId,
            processors: updatedProcessors,
          };

          const updateResponse = await client.ingest.putPipeline(updatedPipeline);
          if (updateResponse.acknowledged === true) {
            response.updated = parentPipelineId;
          }
        }
      }
    }
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
