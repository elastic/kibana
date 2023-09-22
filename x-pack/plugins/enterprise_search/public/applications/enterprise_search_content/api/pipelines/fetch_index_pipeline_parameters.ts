/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IngestPipelineParams } from '@kbn/search-connectors';

import { Actions, createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface FetchIndexPipelineParametersArgs {
  indexName: string;
}
export type FetchIndexPipelineParametersResponse = IngestPipelineParams;

export const fetchIndexPipelineParams = async ({ indexName }: FetchIndexPipelineParametersArgs) => {
  const route = `/internal/enterprise_search/indices/${indexName}/pipeline_parameters`;

  return await HttpLogic.values.http.get<FetchIndexPipelineParametersResponse>(route);
};

export const FetchIndexPipelineParametersApiLogic = createApiLogic(
  ['fetch_index_pipeline_params_api_logic'],
  fetchIndexPipelineParams,
  {
    showErrorFlash: false,
  }
);

export type FetchIndexPipelineParametersApiLogicActions = Actions<
  FetchIndexPipelineParametersArgs,
  FetchIndexPipelineParametersResponse
>;
