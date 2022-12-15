/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  CreateMlInferencePipelineParameters,
  InferencePipelineInferenceConfig,
} from '../../../../../common/types/pipelines';
import { createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface CreateMlInferencePipelineApiLogicArgs {
  destinationField?: string;
  indexName: string;
  inferenceConfig?: InferencePipelineInferenceConfig;
  modelId: string;
  pipelineName: string;
  sourceField: string;
}

export interface CreateMlInferencePipelineResponse {
  created: string;
}

export const createMlInferencePipeline = async (
  args: CreateMlInferencePipelineApiLogicArgs
): Promise<CreateMlInferencePipelineResponse> => {
  const route = `/internal/enterprise_search/indices/${args.indexName}/ml_inference/pipeline_processors`;
  const params: CreateMlInferencePipelineParameters = {
    destination_field: args.destinationField,
    inference_config: args.inferenceConfig,
    model_id: args.modelId,
    pipeline_name: args.pipelineName,
    source_field: args.sourceField,
  };
  return await HttpLogic.values.http.post<CreateMlInferencePipelineResponse>(route, {
    body: JSON.stringify(params),
  });
};

export const CreateMlInferencePipelineApiLogic = createApiLogic(
  ['create_ml_inference_pipeline_api_logic'],
  createMlInferencePipeline
);
