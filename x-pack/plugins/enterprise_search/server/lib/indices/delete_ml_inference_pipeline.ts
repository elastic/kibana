/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IngestPutPipelineRequest } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient } from '@kbn/core/server';

/**
 * Response for deleting sub-pipeline from @ml-inference pipeline.
 * If sub-pipeline was deleted successfully, 'deleted' field contains its name.
 * If parent pipeline was updated successfully, 'updated' field contains its name.
 * If any errors happened, 'errors' will be populated.
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
  const parentPipelineId = `${indexName}@ml-inference`;

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
        const updatedPipeline = {
          ...parentPipeline,
          ...{ processors: updatedProcessors },
        } as IngestPutPipelineRequest;

        const updateResponse = await client.ingest.putPipeline(updatedPipeline);
        if (updateResponse.acknowledged === true) {
          response.updated = parentPipelineId;
        }
      }
    }
  } catch (error) {
    // only catch Not Found error
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
