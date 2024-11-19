/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FetchQueryOptions, QueryClient, UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { getESQLQueryColumns } from '@kbn/esql-utils';
import { KibanaServices } from '../../../common/lib/kibana';

interface FetchEsqlQueryColumnsParams {
  esqlQuery: string;
  queryClient: QueryClient;
}

export function fetchEsqlQueryColumns({
  esqlQuery,
  queryClient,
}: FetchEsqlQueryColumnsParams): Promise<DatatableColumn[]> {
  return queryClient.fetchQuery(tanstackFetchConfigFactory(esqlQuery));
}

export function useEsqlQueryColumns(esqlQuery: string): UseQueryResult<DatatableColumn[]> {
  return useQuery(tanstackFetchConfigFactory(esqlQuery));
}

function tanstackFetchConfigFactory(esqlQuery: string): FetchQueryOptions<DatatableColumn[]> {
  return {
    queryKey: [esqlQuery.trim()],
    queryFn: () => {
      if (esqlQuery.trim() === '') {
        return [];
      }

      return getESQLQueryColumns({
        esqlQuery,
        search: KibanaServices.get().data.search.search,
      });
    },
    staleTime: 60 * 1000,
  };
}
