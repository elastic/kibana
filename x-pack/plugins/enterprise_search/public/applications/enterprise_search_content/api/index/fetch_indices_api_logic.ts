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

export interface FetchIndicesParams {
  from: number;
  onlyShowSearchOptimizedIndices: boolean;
  returnHiddenIndices: boolean;
  searchQuery?: string;
  size?: number;
}

export interface FetchIndicesResponse {
  indices: ElasticsearchIndexWithIngestion[];
  isInitialRequest: boolean;
  meta: Meta;
  onlyShowSearchOptimizedIndices: boolean;
  returnHiddenIndices: boolean;
  searchQuery?: string;
}

export const fetchIndices = async ({
  from,
  onlyShowSearchOptimizedIndices,
  returnHiddenIndices,
  searchQuery,
  size,
}: FetchIndicesParams): Promise<FetchIndicesResponse> => {
  const { http } = HttpLogic.values;
  const route = '/internal/enterprise_search/indices';
  const query = {
    from,
    only_show_search_optimized_indices: onlyShowSearchOptimizedIndices,
    return_hidden_indices: returnHiddenIndices,
    search_query: searchQuery || null,
    size: size ?? 20,
  };
  const response = await http.get<{ indices: ElasticsearchIndexWithIngestion[]; meta: Meta }>(
    route,
    {
      query,
    }
  );

  // We need this to determine whether to show the empty state on the indices page
  const isInitialRequest = from === 0 && !searchQuery && !onlyShowSearchOptimizedIndices;

  return {
    ...response,
    isInitialRequest,
    onlyShowSearchOptimizedIndices,
    returnHiddenIndices,
    searchQuery,
  };
};

export const FetchIndicesAPILogic = createApiLogic(['content', 'indices_api_logic'], fetchIndices);

export type FetchIndicesApiActions = Actions<FetchIndicesParams, FetchIndicesResponse>;
