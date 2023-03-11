/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InferencePipeline } from '../../../../../common/types/pipelines';
import { createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface FetchMlInferencePipelineProcessorsApiLogicArgs {
  indexName: string;
}

export type FetchMlInferencePipelineProcessorsResponse = InferencePipeline[];

export const fetchMlInferencePipelineProcessors = async ({
  indexName,
}: FetchMlInferencePipelineProcessorsApiLogicArgs) => {
  const route = `/internal/enterprise_search/indices/${indexName}/ml_inference/pipeline_processors`;

  return await HttpLogic.values.http.get<FetchMlInferencePipelineProcessorsResponse>(route);
};

export const FetchMlInferencePipelineProcessorsApiLogic = createApiLogic(
  ['fetch_ml_inference_pipeline_processors_api_logic'],
  fetchMlInferencePipelineProcessors
);
