/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';

import { formatMlPipelineBody } from './create_pipeline_definitions';
import { ErrorCode } from '../../common/types/error_codes';

/**
 * Details of a created pipeline.
 */
export interface CreatedPipeline {
  created: string;
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
): Promise<CreatedPipeline> => {
  const inferencePipelineGeneratedName = `ml-inference-${pipelineName}`;

  // Check that a pipeline with the same name doesn't already exist
  let pipelineByName = {};
  try {
    pipelineByName = await esClient.ingest.getPipeline({
      id: inferencePipelineGeneratedName,
    });
  } catch (error) {
    // Silently swallow error
  }
  if (pipelineByName[inferencePipelineGeneratedName as keyof typeof pipelineByName]) {
    throw new Error(ErrorCode.PIPELINE_ALREADY_EXISTS);
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
    created: inferencePipelineGeneratedName,
  });
};
