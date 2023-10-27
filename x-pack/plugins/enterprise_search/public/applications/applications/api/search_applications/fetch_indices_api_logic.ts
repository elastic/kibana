/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta } from '../../../../../common/types';
import { ElasticsearchIndexWithIngestion } from '../../../../../common/types/indices';

import { Actions, createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { INPUT_THROTTLE_DELAY_MS } from '../../../shared/constants/timers';
import { HttpLogic } from '../../../shared/http';

export interface SearchApplicationsFetchIndicesApiParams {
  searchQuery?: string;
}

export interface SearchApplicationsFetchIndicesApiResponse {
  indices: ElasticsearchIndexWithIngestion[];
  meta: Meta;
  searchQuery?: string;
}

const INDEX_SEARCH_PAGE_SIZE = 40;

export const fetchIndices = async ({
  searchQuery,
}: SearchApplicationsFetchIndicesApiParams): Promise<SearchApplicationsFetchIndicesApiResponse> => {
  const { http } = HttpLogic.values;
  const route = '/internal/enterprise_search/indices';
  const query = {
    from: 0,
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

export const FetchIndicesForSearchApplicationsAPILogic = createApiLogic(
  ['search_applications', 'fetch_indices_api_logic'],
  fetchIndices,
  {
    requestBreakpointMS: INPUT_THROTTLE_DELAY_MS,
  }
);

export type FetchIndicesForSearchApplicationsAPILogicActions = Actions<
  SearchApplicationsFetchIndicesApiParams,
  SearchApplicationsFetchIndicesApiResponse
>;
