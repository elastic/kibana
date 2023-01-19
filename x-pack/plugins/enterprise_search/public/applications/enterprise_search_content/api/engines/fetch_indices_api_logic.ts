/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta } from '../../../../../common/types';
import { ElasticsearchIndexWithIngestion } from '../../../../../common/types/indices';

import { Actions, createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface EnginesFetchIndicesApiParams {
  searchQuery?: string;
}

export interface EnginesFetchIndicesApiResponse {
  indices: ElasticsearchIndexWithIngestion[];
  meta: Meta;
  searchQuery?: string;
}

const INDEX_SEARCH_PAGE_SIZE = 40;

export const fetchIndices = async ({
  searchQuery,
}: EnginesFetchIndicesApiParams): Promise<EnginesFetchIndicesApiResponse> => {
  const { http } = HttpLogic.values;
  const route = '/internal/enterprise_search/indices';
  const query = {
    page: 1,
    return_hidden_indices: false,
    search_query: searchQuery || null,
    size: INDEX_SEARCH_PAGE_SIZE,
  };
  const response = await http.get<{ indices: ElasticsearchIndexWithIngestion[]; meta: Meta }>(
    route,
    {
      query,
    }
  );

  return { ...response, searchQuery };
};

export const FetchIndicesForEnginesAPILogic = createApiLogic(
  ['content', 'engines_fetch_indices_api_logic'],
  fetchIndices
);

export type FetchIndicesForEnginesAPILogicActions = Actions<
  EnginesFetchIndicesApiParams,
  EnginesFetchIndicesApiResponse
>;
