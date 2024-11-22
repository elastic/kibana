/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Pagination } from '@elastic/eui';
import { SearchHit } from '@kbn/es-types';
import { pageToPagination, Paginate } from '@kbn/search-index-documents';
import { useQuery } from '@tanstack/react-query';
import { useKibana } from '../use_kibana';
import { QueryKeys, DEFAULT_DOCUMENT_PAGE_SIZE } from '../../constants';

export interface IndexDocuments {
  meta: Pagination;
  results: Paginate<SearchHit>;
}
const DEFAULT_PAGINATION = {
  from: 0,
  has_more_hits_than_total: false,
  size: DEFAULT_DOCUMENT_PAGE_SIZE,
  total: 0,
};
export const INDEX_SEARCH_POLLING = 5 * 1000;
export const useIndexDocumentSearch = (indexName: string) => {
  const {
    services: { http },
  } = useKibana();
  const response = useQuery({
    queryKey: [QueryKeys.SearchDocuments, indexName],
    refetchInterval: INDEX_SEARCH_POLLING,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: 'always',
    queryFn: async ({ signal }) =>
      http.post<IndexDocuments>(`/internal/serverless_search/indices/${indexName}/search`, {
        body: JSON.stringify({
          searchQuery: '',
          trackTotalHits: true,
        }),
        query: {
          page: 0,
          size: DEFAULT_DOCUMENT_PAGE_SIZE,
        },
        signal,
      }),
  });
  return {
    ...response,
    meta: pageToPagination(response?.data?.results?._meta?.page ?? DEFAULT_PAGINATION),
  };
};
