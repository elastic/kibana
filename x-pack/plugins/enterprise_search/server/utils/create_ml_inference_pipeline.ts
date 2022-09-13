/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';

import { formatMlPipelineBody } from './create_pipeline_definitions';

export interface CreatedPipeline {
  created: string;
}

// TODO: document
export const createMlInferencePipeline = async (
  pipelineName: string,
  modelId: string,
  sourceField: string,
  destinationField: string,
  esClient: ElasticsearchClient
): Promise<CreatedPipeline> => {
  const inferencePipelineGeneratedName = `ml-inference-${pipelineName}`;

  // Check for existing pipeline
  let exists = false;
  try {
    await esClient.ingest.getPipeline({ id: inferencePipelineGeneratedName });
    exists = true;
  } catch (err) {
    // NOP
  }
  if (exists) {
    throw new Error(`Pipeline ${inferencePipelineGeneratedName} already exists`);
  }

  // Generate pipeline with default processors
  const mlInferencePipeline = await formatMlPipelineBody(modelId, sourceField, destinationField, esClient);

  await esClient.ingest.putPipeline({
    id: inferencePipelineGeneratedName,
    ...mlInferencePipeline,
  });

  return {
    created: inferencePipelineGeneratedName,
  };
};
