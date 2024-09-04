/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFormContext } from 'react-hook-form';
import { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import useSWR from 'swr';
import { APIRoutes, ChatFormFields, Pagination } from '../types';
import { useKibana } from './use_kibana';
import { DEFAULT_PAGINATION } from '../../common';

export interface FetchSearchResultsArgs {
  query: string;
  pagination: Pagination;
}

interface UseSearchPreviewData {
  results: SearchHit[];
  pagination: Pagination;
  isInitialState: boolean;
}

export interface UseSearchPreviewResponse {
  fetchSearchResults: (args: FetchSearchResultsArgs) => Promise<void>;
  data: UseSearchPreviewData;
}

const DEFAULT_SEARCH_PREVIEW_DATA: UseSearchPreviewData = {
  results: [],
  pagination: DEFAULT_PAGINATION,
  isInitialState: true,
};

export const useSearchPreview = (): UseSearchPreviewResponse => {
  const { getValues } = useFormContext();
  const { services } = useKibana();
  const { http } = services;

  const { data, mutate } = useSWR<UseSearchPreviewData>('search-preview-results', null, {
    fallbackData: DEFAULT_SEARCH_PREVIEW_DATA,
  });

  const fetchSearchResults = async ({
    query,
    pagination: paginationParam = DEFAULT_PAGINATION,
  }: FetchSearchResultsArgs) => {
    const { results, pagination: paginationResult } = await http.post<{
      results: SearchHit[];
      pagination: Pagination;
    }>(APIRoutes.POST_SEARCH_QUERY, {
      body: JSON.stringify({
        search_query: query,
        elasticsearch_query: JSON.stringify(getValues(ChatFormFields.elasticsearchQuery)),
        indices: getValues(ChatFormFields.indices),
        size: paginationParam.size,
        from: paginationParam.from,
      }),
    });
    mutate({ results, pagination: paginationResult, isInitialState: false });
  };

  return { fetchSearchResults, data: data || DEFAULT_SEARCH_PREVIEW_DATA };
};
