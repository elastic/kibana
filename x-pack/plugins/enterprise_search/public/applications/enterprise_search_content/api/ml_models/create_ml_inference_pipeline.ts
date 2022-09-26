/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface CreateMlInferencePipelineApiLogicArgs {
  indexName: string;
  pipelineName: string;
  modelId: string;
  sourceField: string;
  destinationField?: string;
}

export interface CreateMlInferencePipelineResponse {
  created: string;
}

export const createMlInferencePipeline = async (
  args: CreateMlInferencePipelineApiLogicArgs
): Promise<CreateMlInferencePipelineResponse> => {
  const route = `/internal/enterprise_search/indices/${args.indexName}/ml_inference/pipeline_processors`;
  const params = {
    pipeline_name: args.pipelineName,
    model_id: args.modelId,
    source_field: args.sourceField,
    destination_field: args.destinationField,
  };
  return await HttpLogic.values.http.post<CreateMlInferencePipelineResponse>(route, {
    body: JSON.stringify(params),
  });
};

export const CreateMlInferencePipelineApiLogic = createApiLogic(
  ['create_ml_inference_pipeline_api_logic'],
  createMlInferencePipeline
);
