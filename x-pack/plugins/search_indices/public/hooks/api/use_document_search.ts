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

interface IndexDocuments {
  meta: Pagination;
  results: Paginate<SearchHit>;
}
const DEFAULT_PAGINATION = {
  from: 0,
  has_more_hits_than_total: false,
  size: 10,
  total: 0,
};
const pollingInterval = 5 * 1000;
export const useIndexDocumentSearch = (
  indexName: string,
  pagination: Omit<Pagination, 'totalItemCount'>,
  searchQuery?: string
) => {
  const {
    services: { http },
  } = useKibana();
  const response = useQuery({
    queryKey: ['fetchIndexDocuments', pagination, searchQuery],
    refetchInterval: pollingInterval,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: 'always',
    queryFn: async () =>
      http.post<IndexDocuments>(`/internal/serverless_search/indices/${indexName}/search`, {
        body: JSON.stringify({
          searchQuery,
        }),
        query: {
          page: pagination.pageIndex,
          size: pagination.pageSize,
        },
      }),
  });
  return {
    ...response,
    meta: pageToPagination(response?.data?.results?._meta?.page ?? DEFAULT_PAGINATION),
  };
};
