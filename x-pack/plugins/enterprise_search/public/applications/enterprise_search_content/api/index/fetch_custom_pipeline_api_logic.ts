/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IngestPipeline } from '@elastic/elasticsearch/lib/api/types';

import { createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface FetchCustomPipelineApiLogicArgs {
  indexName: string;
}

export type FetchCustomPipelineApiLogicResponse = Record<string, IngestPipeline | undefined>;

export const fetchCustomPipeline = async ({
  indexName,
}: FetchCustomPipelineApiLogicArgs): Promise<FetchCustomPipelineApiLogicResponse> => {
  const route = `/internal/enterprise_search/indices/${indexName}/pipelines`;
  const result = await HttpLogic.values.http.get<FetchCustomPipelineApiLogicResponse>(route);
  return result;
};

export const FetchCustomPipelineApiLogic = createApiLogic(
  ['content', 'fetch_custom_pipeline_api_logic'],
  fetchCustomPipeline
);
