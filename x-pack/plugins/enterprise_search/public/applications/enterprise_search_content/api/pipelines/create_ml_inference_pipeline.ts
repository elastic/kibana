/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FieldMapping } from '../../../../../common/ml_inference_pipeline';

import {
  CreateMlInferencePipelineParameters,
  CreateMLInferencePipelineDefinition,
  MlInferencePipeline,
  InferencePipelineInferenceConfig,
} from '../../../../../common/types/pipelines';
import { createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

interface CreateMlInferencePipelineApiLogicArgsWithPipelineParameters {
  destinationField?: string;
  indexName: string;
  inferenceConfig?: InferencePipelineInferenceConfig;
  modelId: string;
  pipelineName: string;
  sourceField: string;
}

interface CreateMlInferencePipelineApiLogicArgsWithPipelineDefinition {
  fieldMappings: FieldMapping[];
  indexName: string;
  pipelineDefinition: MlInferencePipeline;
  pipelineName: string;
}

export type CreateMlInferencePipelineApiLogicArgs =
  | CreateMlInferencePipelineApiLogicArgsWithPipelineParameters
  | CreateMlInferencePipelineApiLogicArgsWithPipelineDefinition;

export interface CreateMlInferencePipelineResponse {
  created: string;
}

const isArgsWithPipelineParameters = (
  args: CreateMlInferencePipelineApiLogicArgs
): args is CreateMlInferencePipelineApiLogicArgsWithPipelineParameters => {
  return (
    typeof (args as CreateMlInferencePipelineApiLogicArgsWithPipelineParameters).modelId ===
    'string'
  );
};

const isArgsWithPipelineDefinition = (
  args: CreateMlInferencePipelineApiLogicArgs
): args is CreateMlInferencePipelineApiLogicArgsWithPipelineDefinition => {
  return (
    typeof (args as CreateMlInferencePipelineApiLogicArgsWithPipelineDefinition)
      .pipelineDefinition === 'object'
  );
};

export const createMlInferencePipeline = async (
  args: CreateMlInferencePipelineApiLogicArgs
): Promise<CreateMlInferencePipelineResponse> => {
  const route = `/internal/enterprise_search/indices/${args.indexName}/ml_inference/pipeline_processors`;
  let params: CreateMlInferencePipelineParameters | CreateMLInferencePipelineDefinition | undefined;
  if (isArgsWithPipelineParameters(args)) {
    params = {
      destination_field: args.destinationField,
      inference_config: args.inferenceConfig,
      model_id: args.modelId,
      pipeline_definition: undefined,
      pipeline_name: args.pipelineName,
      source_field: args.sourceField,
    };
  } else if (isArgsWithPipelineDefinition(args)) {
    params = {
      field_mappings: args.fieldMappings,
      pipeline_definition: args.pipelineDefinition,
      pipeline_name: args.pipelineName,
    };
  }
  return await HttpLogic.values.http.post<CreateMlInferencePipelineResponse>(route, {
    body: JSON.stringify(params),
  });
};

export const CreateMlInferencePipelineApiLogic = createApiLogic(
  ['create_ml_inference_pipeline_api_logic'],
  createMlInferencePipeline
);
