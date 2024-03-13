/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchIndexWithIngestion } from '../../../../../common/types/indices';
import { Meta } from '../../../../../common/types/pagination';

import { Actions, createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface FetchAllIndicesResponse {
  indices: ElasticsearchIndexWithIngestion[];
  meta: Meta;
}

export const fetchAllIndices = async (): Promise<FetchAllIndicesResponse> => {
  const { http } = HttpLogic.values;
  const route = '/internal/enterprise_search/indices';
  const response = await http.get<FetchAllIndicesResponse>(route);
  return response;
};

export const FetchAllIndicesAPILogic = createApiLogic(
  ['content', 'fetch_all_indices_api_logic'],
  fetchAllIndices
);

export type FetchAllIndicesApiActions = Actions<{}, FetchAllIndicesResponse>;
