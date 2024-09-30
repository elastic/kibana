/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { useQuery } from '@tanstack/react-query';
import { useFormContext } from 'react-hook-form';
import { APIRoutes, ChatForm, ChatFormFields, Pagination } from '../types';
import { useKibana } from './use_kibana';
import { DEFAULT_PAGINATION } from '../../common';

export interface FetchSearchResultsArgs {
  query: string;
  pagination: Pagination;
  indices: ChatForm[ChatFormFields.indices];
  elasticsearchQuery: ChatForm[ChatFormFields.elasticsearchQuery];
  http: ReturnType<typeof useKibana>['services']['http'];
}

interface UseSearchPreviewData {
  results: SearchHit[];
  pagination: Pagination;
}

export interface UseSearchPreviewResponse {
  fetchSearchResults: (args: FetchSearchResultsArgs) => Promise<void>;
  data: UseSearchPreviewData;
}

export const DEFAULT_SEARCH_PREVIEW_DATA: UseSearchPreviewData = {
  results: [],
  pagination: DEFAULT_PAGINATION,
};

export const fetchSearchResults = async ({
  query,
  indices,
  elasticsearchQuery,
  pagination: paginationParam = DEFAULT_PAGINATION,
  http,
}: FetchSearchResultsArgs): Promise<UseSearchPreviewData> => {
  const { results, pagination: paginationResult } = await http.post<{
    results: SearchHit[];
    pagination: Pagination;
  }>(APIRoutes.POST_SEARCH_QUERY, {
    body: JSON.stringify({
      search_query: query,
      elasticsearch_query: JSON.stringify(elasticsearchQuery),
      indices,
      size: paginationParam.size,
      from: paginationParam.from,
    }),
  });
  return { results, pagination: paginationResult };
};

export const useSearchPreview = ({
  query,
  pagination,
}: {
  query: string;
  pagination: Pagination;
}) => {
  const { services } = useKibana();
  const { getValues } = useFormContext();
  const { http } = services;
  const indices = getValues(ChatFormFields.indices);
  const elasticsearchQuery = getValues(ChatFormFields.elasticsearchQuery);

  const { data } = useQuery({
    queryKey: ['search-preview-results', query, indices, elasticsearchQuery, pagination],
    queryFn: () => fetchSearchResults({ query, pagination, http, indices, elasticsearchQuery }),
    initialData: DEFAULT_SEARCH_PREVIEW_DATA,
    enabled: !!query,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });

  return {
    pagination: data.pagination,
    results: data.results,
  };
};
