/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  QueryObserverResult,
  RefetchOptions,
  RefetchQueryFilters,
  useQuery,
} from '@tanstack/react-query';
import type { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import { useKibana } from '../../utils/kibana_react';

type SloId = string;

interface Params {
  sloIds?: SloId[];
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type SloRule = { sloId: string; name: string };

interface RuleApiResponse {
  page: number;
  total: number;
  per_page: number;
  data: Array<Rule<SloRule>>;
}

export interface UseFetchRulesForSloResponse {
  isInitialLoading: boolean;
  isLoading: boolean;
  isRefetching: boolean;
  isSuccess: boolean;
  isError: boolean;
  data: Record<string, Array<Rule<SloRule>>> | undefined;
  refetch: <TPageData>(
    options?: (RefetchOptions & RefetchQueryFilters<TPageData>) | undefined
  ) => Promise<QueryObserverResult<Record<string, Array<Rule<SloRule>>> | undefined, unknown>>;
}

export function useFetchRulesForSlo({ sloIds }: Params): UseFetchRulesForSloResponse {
  const { http } = useKibana().services;

  const { isInitialLoading, isLoading, isError, isSuccess, isRefetching, data, refetch } = useQuery(
    {
      queryKey: ['fetchRulesForSlo', sloIds],
      queryFn: async () => {
        try {
          const body = JSON.stringify({
            filter: `${sloIds?.reduce((acc, sloId, index, array) => {
              return `${acc}alert.attributes.params.sloId:${sloId}${
                index < array.length - 1 ? ' or ' : ''
              }`;
            }, '')}`,
            fields: ['params.sloId', 'name'],
            per_page: 1000,
          });

          const response = await http.post<RuleApiResponse>(`/internal/alerting/rules/_find`, {
            body,
          });

          const init = sloIds?.reduce((acc, sloId) => ({ ...acc, [sloId]: [] }), {});

          return response.data.reduce(
            (acc, rule) => ({
              ...acc,
              [rule.params.sloId]: acc[rule.params.sloId].concat(rule),
            }),
            init as Record<string, Array<Rule<SloRule>>>
          );
        } catch (error) {
          // ignore error for retrieving slos
        }
      },
      enabled: Boolean(sloIds?.length),
      refetchOnWindowFocus: false,
      keepPreviousData: true,
    }
  );

  return {
    data,
    isLoading,
    isInitialLoading,
    isRefetching,
    isSuccess,
    isError,
    refetch,
  };
}
