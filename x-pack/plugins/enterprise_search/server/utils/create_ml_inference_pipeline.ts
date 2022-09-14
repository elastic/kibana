/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';

import { formatMlPipelineBody } from './create_pipeline_definitions';

/**
 * Indicators for a possibly created pipeline.
 */
export interface CreatedPipelineFlags {
  created?: boolean;
  exists?: boolean;
}

/**
 * Creates a Machine Learning Inference pipeline with the given settings, if it doesn't exist yet.
 * @param pipelineName pipeline name set by the user.
 * @param modelId model ID selected by the user.
 * @param sourceField The document field that model will read.
 * @param destinationField The document field that the model will write to.
 * @param esClient the Elasticsearch Client to use when retrieving model details.
 */
export const createMlInferencePipeline = async (
  pipelineName: string,
  modelId: string,
  sourceField: string,
  destinationField: string,
  esClient: ElasticsearchClient
): Promise<CreatedPipelineFlags> => {
  const inferencePipelineGeneratedName = `ml-inference-${pipelineName}`;

  // Check that a pipeline with the same name doesn't already exist
  try {
    const pipelineByName = await esClient.ingest.getPipeline({
      id: inferencePipelineGeneratedName,
    });

    if (pipelineByName[inferencePipelineGeneratedName]) {
      return Promise.resolve({
        exists: true,
      });
    }
  } catch (e) {
    // Silently swallow error
  }

  // Generate pipeline with default processors
  const mlInferencePipeline = await formatMlPipelineBody(
    modelId,
    sourceField,
    destinationField,
    esClient
  );

  await esClient.ingest.putPipeline({
    id: inferencePipelineGeneratedName,
    ...mlInferencePipeline,
  });

  return Promise.resolve({
    created: true,
  });
};
