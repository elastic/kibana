/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IngestPutPipelineRequest } from '@elastic/elasticsearch/lib/api/types';
import { IScopedClusterClient } from '@kbn/core/server';

export interface DeleteMlInferencePipelineResponse {
  deleted?: string;
  errors?: string[];
  updated?: string;
}

export const deleteMlInferencePipeline = async (
  client: IScopedClusterClient,
  index: string,
  pipelineName: string
) => {
  const response: DeleteMlInferencePipelineResponse = {};
  const parentPipelineId = `${index}@ml-inference`;

  // find parent pipeline
  const pipelineResponse = await client.asCurrentUser.ingest.getPipeline({
    id: parentPipelineId,
  });

  const parentPipeline = pipelineResponse[`${index}@ml-inference`];

  // remove sub-pipeline from parent pipeline
  if (parentPipeline.processors !== undefined) {
    const updatedProcessors = parentPipeline.processors.filter(
      (p) => !(p.pipeline !== undefined && p.pipeline.name === pipelineName)
    );
    const updatedPipeline = {
      ...parentPipeline,
      ...{ processors: updatedProcessors },
    } as IngestPutPipelineRequest;

    const updateResponse = await client.asCurrentUser.ingest.putPipeline(updatedPipeline);
    if (updateResponse.acknowledged) {
      response.updated = parentPipelineId;
    }
  }

  // finally, delete pipeline
  const deleteResponse = await client.asCurrentUser.ingest.deletePipeline({ id: pipelineName });
  if (deleteResponse.acknowledged) {
    response.deleted = pipelineName;
  }

  return response;
};
