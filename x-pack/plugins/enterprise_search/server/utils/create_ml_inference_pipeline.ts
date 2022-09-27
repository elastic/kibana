/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IngestGetPipelineResponse, IngestPipeline } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient } from '@kbn/core/server';

import { ErrorCode } from '../../common/types/error_codes';

import { formatMlPipelineBody } from '../lib/pipelines/create_pipeline_definitions';

import {
  getInferencePipelineNameFromIndexName,
  getPrefixedInferencePipelineProcessorName,
  formatPipelineName,
} from './ml_inference_pipeline_utils';

/**
 * Details of a created pipeline.
 */
export interface CreatedPipeline {
  id: string;
  created?: boolean;
  addedToParentPipeline?: boolean;
}

/**
 * Creates a Machine Learning Inference pipeline with the given settings, if it doesn't exist yet,
 * then references it in the "parent" ML Inference pipeline that is associated with the index.
 * @param indexName name of the index this pipeline corresponds to.
 * @param pipelineName pipeline name set by the user.
 * @param modelId model ID selected by the user.
 * @param sourceField The document field that model will read.
 * @param destinationField The document field that the model will write to.
 * @param esClient the Elasticsearch Client to use when retrieving pipeline and model details.
 */
export const createAndReferenceMlInferencePipeline = async (
  indexName: string,
  pipelineName: string,
  modelId: string,
  sourceField: string,
  destinationField: string | null | undefined,
  esClient: ElasticsearchClient
): Promise<CreatedPipeline> => {
  const createPipelineResult = await createMlInferencePipeline(
    pipelineName,
    modelId,
    sourceField,
    destinationField,
    esClient
  );

  const addSubPipelineResult = await addSubPipelineToIndexSpecificMlPipeline(
    indexName,
    createPipelineResult.id,
    esClient
  );

  return Promise.resolve({
    ...createPipelineResult,
    addedToParentPipeline: addSubPipelineResult.addedToParentPipeline,
  });
};

/**
 * Creates a Machine Learning Inference pipeline with the given settings, if it doesn't exist yet.
 * @param pipelineName pipeline name set by the user.
 * @param modelId model ID selected by the user.
 * @param sourceField The document field that model will read.
 * @param destinationField The document field that the model will write to.
 * @param esClient the Elasticsearch Client to use when retrieving pipeline and model details.
 */
export const createMlInferencePipeline = async (
  pipelineName: string,
  modelId: string,
  sourceField: string,
  destinationField: string | null | undefined,
  esClient: ElasticsearchClient
): Promise<CreatedPipeline> => {
  const inferencePipelineGeneratedName = getPrefixedInferencePipelineProcessorName(pipelineName);

  // Check that a pipeline with the same name doesn't already exist
  let pipelineByName: IngestGetPipelineResponse | undefined;
  try {
    pipelineByName = await esClient.ingest.getPipeline({
      id: inferencePipelineGeneratedName,
    });
  } catch (error) {
    // Silently swallow error
  }
  if (pipelineByName?.[inferencePipelineGeneratedName]) {
    throw new Error(ErrorCode.PIPELINE_ALREADY_EXISTS);
  }

  // Generate pipeline with default processors
  const mlInferencePipeline = await formatMlPipelineBody(
    inferencePipelineGeneratedName,
    modelId,
    sourceField,
    destinationField || formatPipelineName(pipelineName),
    esClient
  );

  await esClient.ingest.putPipeline({
    id: inferencePipelineGeneratedName,
    ...mlInferencePipeline,
  });

  return Promise.resolve({
    id: inferencePipelineGeneratedName,
    created: true,
  });
};

/**
 * Adds the supplied a Machine Learning Inference pipeline reference to the "parent" ML Inference
 * pipeline that is associated with the index.
 * @param indexName name of the index this pipeline corresponds to.
 * @param pipelineName name of the ML Inference pipeline to add.
 * @param esClient the Elasticsearch Client to use when retrieving pipeline details.
 */
export const addSubPipelineToIndexSpecificMlPipeline = async (
  indexName: string,
  pipelineName: string,
  esClient: ElasticsearchClient
): Promise<CreatedPipeline> => {
  const parentPipelineId = getInferencePipelineNameFromIndexName(indexName);

  // Fetch the parent pipeline
  let parentPipeline: IngestPipeline | undefined;
  try {
    const pipelineResponse = await esClient.ingest.getPipeline({
      id: parentPipelineId,
    });
    parentPipeline = pipelineResponse[parentPipelineId];
  } catch (error) {
    // Swallow error; in this case the next step will return
  }

  // Verify the parent pipeline exists with a processors array
  if (!parentPipeline?.processors) {
    return Promise.resolve({
      id: pipelineName,
      addedToParentPipeline: false,
    });
  }

  // Check if the sub-pipeline reference is already in the list of processors,
  // if so, don't modify it
  const existingSubPipeline = parentPipeline.processors.find(
    (p) => p.pipeline?.name === pipelineName
  );
  if (existingSubPipeline) {
    return Promise.resolve({
      id: pipelineName,
      addedToParentPipeline: false,
    });
  }

  // Add sub-processor to the ML inference parent pipeline
  parentPipeline.processors.push({
    pipeline: {
      name: pipelineName,
    },
  });

  await esClient.ingest.putPipeline({
    id: parentPipelineId,
    ...parentPipeline,
  });

  return Promise.resolve({
    id: pipelineName,
    addedToParentPipeline: true,
  });
};
