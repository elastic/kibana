/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MlInferencePipeline } from '../../../../../common/types/pipelines';
import { Actions, createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface FetchPipelineArgs {
  pipelineName: string;
}
export type FetchPipelineResponse = Record<string, MlInferencePipeline | undefined>;

export const fetchPipeline = async ({ pipelineName }: FetchPipelineArgs) => {
  const route = `/internal/enterprise_search/pipelines/${pipelineName}`;

  return await HttpLogic.values.http.get<FetchPipelineResponse>(route);
};

export const FetchPipelineApiLogic = createApiLogic(['fetch_pipeline_api_logic'], fetchPipeline, {
  showErrorFlash: false,
});

export type FetchPipelineApiLogicActions = Actions<FetchPipelineArgs, FetchPipelineResponse>;
