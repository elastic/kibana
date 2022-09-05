/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta } from '../../../../../common/types';
import { ElasticsearchIndexWithIngestion } from '../../../../../common/types/indices';

import { createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export const fetchIndices = async ({
  meta,
  returnHiddenIndices,
  searchQuery,
}: {
  meta: Meta;
  returnHiddenIndices: boolean;
  searchQuery?: string;
}) => {
  const { http } = HttpLogic.values;
  const route = '/internal/enterprise_search/indices';
  const query = {
    page: meta.page.current,
    return_hidden_indices: returnHiddenIndices,
    search_query: searchQuery || null,
    size: 20,
  };
  const response = await http.get<{ indices: ElasticsearchIndexWithIngestion[]; meta: Meta }>(
    route,
    {
      query,
    }
  );

  // We need this to determine whether to show the empty state on the indices page
  const isInitialRequest = meta.page.current === 1 && !searchQuery;

  return { ...response, isInitialRequest, returnHiddenIndices, searchQuery };
};

export const FetchIndicesAPILogic = createApiLogic(['content', 'indices_api_logic'], fetchIndices);
