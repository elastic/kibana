/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IngestGetPipelineResponse, IngestPipeline } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient } from '@kbn/core/server';

import { FieldMapping, formatPipelineName } from '../../../../../../common/ml_inference_pipeline';
import { ErrorCode } from '../../../../../../common/types/error_codes';
import type {
  PreparePipelineAndIndexForMlInferenceResult,
  InferencePipelineInferenceConfig,
  CreatePipelineResult,
} from '../../../../../../common/types/pipelines';
import { addSubPipelineToIndexSpecificMlPipeline } from '../../../../../utils/create_ml_inference_pipeline';
import { getPrefixedInferencePipelineProcessorName } from '../../../../../utils/ml_inference_pipeline_utils';
import { formatMlPipelineBody } from '../../../../pipelines/create_pipeline_definitions';
import { updateMlInferenceMappings } from '../update_ml_inference_mappings';

/**
 * Creates a Machine Learning Inference pipeline with the given settings, if it doesn't exist yet,
 * then references it in the "parent" ML Inference pipeline that is associated with the index.
 * Finally, updates the index's mappings to accommodate the specified outputs of the inference model (if able)
 * @param indexName name of the index this pipeline corresponds to.
 * @param pipelineName pipeline name set by the user.
 * @param pipelineDefinition
 * @param modelId model ID selected by the user.
 * @param sourceField The document field that model will read.
 * @param destinationField The document field that the model will write to.
 * @param fieldMappings The array of objects representing the source field (text) names and target fields (ML output) names
 * @param inferenceConfig The configuration for the model.
 * @param esClient the Elasticsearch Client to use when retrieving pipeline and model details.
 */
export const preparePipelineAndIndexForMlInference = async (
  indexName: string,
  pipelineName: string,
  pipelineDefinition: IngestPipeline | undefined,
  modelId: string,
  sourceField: string | undefined,
  destinationField: string | null | undefined,
  fieldMappings: FieldMapping[] | undefined,
  inferenceConfig: InferencePipelineInferenceConfig | undefined,
  esClient: ElasticsearchClient
): Promise<PreparePipelineAndIndexForMlInferenceResult> => {
  const createPipelineResult = await createMlInferencePipeline(
    pipelineName,
    pipelineDefinition,
    modelId,
    sourceField,
    destinationField,
    inferenceConfig,
    esClient
  );

  const addSubPipelineResult = await addSubPipelineToIndexSpecificMlPipeline(
    indexName,
    createPipelineResult.id,
    esClient
  );

  const mappingResponse = fieldMappings
    ? (await updateMlInferenceMappings(indexName, modelId, fieldMappings, esClient)).acknowledged
    : false;

  return {
    added_to_parent_pipeline: addSubPipelineResult.addedToParentPipeline,
    created_pipeline: createPipelineResult.created,
    mapping_updated: mappingResponse,
    pipeline_id: createPipelineResult.id,
  };
};

/**
 * Creates a Machine Learning Inference pipeline with the given settings, if it doesn't exist yet.
 * @param pipelineName pipeline name set by the user.
 * @param pipelineDefinition full definition of the pipeline
 * @param modelId model ID selected by the user.
 * @param sourceField The document field that model will read.
 * @param destinationField The document field that the model will write to.
 * @param inferenceConfig The configuration for the model.
 * @param esClient the Elasticsearch Client to use when retrieving pipeline and model details.
 */
export const createMlInferencePipeline = async (
  pipelineName: string,
  pipelineDefinition: IngestPipeline | undefined,
  modelId: string | undefined,
  sourceField: string | undefined,
  destinationField: string | null | undefined,
  inferenceConfig: InferencePipelineInferenceConfig | undefined,
  esClient: ElasticsearchClient
): Promise<CreatePipelineResult> => {
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

  if (!(modelId && sourceField) && !pipelineDefinition) {
    throw new Error(ErrorCode.PARAMETER_CONFLICT);
  }
  const mlInferencePipeline =
    modelId && sourceField
      ? await formatMlPipelineBody(
          inferencePipelineGeneratedName,
          modelId,
          sourceField,
          destinationField || formatPipelineName(pipelineName),
          inferenceConfig,
          esClient
        )
      : { ...pipelineDefinition, version: 1 };

  await esClient.ingest.putPipeline({
    id: inferencePipelineGeneratedName,
    ...mlInferencePipeline,
  });

  return {
    created: true,
    id: inferencePipelineGeneratedName,
  };
};
