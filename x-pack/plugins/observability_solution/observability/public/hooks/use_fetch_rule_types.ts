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
import { camelCase, mapKeys } from 'lodash';
import { i18n } from '@kbn/i18n';
import { BASE_ALERTING_API_PATH } from '@kbn/alerting-plugin/common';
import type { RuleType } from '@kbn/triggers-actions-ui-plugin/public';
import type { AsApiContract } from '@kbn/actions-plugin/common';
import { useKibana } from '../utils/kibana_react';

export interface UseFetchRuleTypesResponse {
  isInitialLoading: boolean;
  isLoading: boolean;
  isRefetching: boolean;
  isSuccess: boolean;
  isError: boolean;
  ruleTypes: RuleType[] | undefined;
  refetch: <TPageData>(
    options?: (RefetchOptions & RefetchQueryFilters<TPageData>) | undefined
  ) => Promise<QueryObserverResult<RuleType[] | undefined, unknown>>;
}

export function useFetchRuleTypes({
  filterByRuleTypeIds,
}: {
  filterByRuleTypeIds?: string[] | undefined;
}): UseFetchRuleTypesResponse {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const { isInitialLoading, isLoading, isError, isSuccess, isRefetching, data, refetch } = useQuery(
    {
      queryKey: ['fetchRuleTypes', filterByRuleTypeIds],
      queryFn: async ({ signal }) => {
        try {
          const res = await http.get<Array<AsApiContract<RuleType<string, string>>>>(
            `${BASE_ALERTING_API_PATH}/rule_types`,
            { signal }
          );

          const response = res.map((item) => {
            return mapKeys(item, (_, k) => camelCase(k));
          }) as unknown as Array<RuleType<string, string>>;

          return filterByRuleTypeIds && filterByRuleTypeIds.length > 0
            ? response.filter((item) => filterByRuleTypeIds.includes(item.id))
            : response;
        } catch (error) {
          throw error;
        }
      },
      keepPreviousData: true,
      refetchOnWindowFocus: false,
      onError: (error: Error) => {
        toasts.addError(error, {
          title: i18n.translate('xpack.observability.ruleDetails.ruleTypeLoadError', {
            defaultMessage: 'Unable to load rule type.',
          }),
          toastMessage:
            error instanceof Error ? error.message : typeof error === 'string' ? error : '',
        });
      },
    }
  );

  return {
    ruleTypes: data,
    isLoading,
    isInitialLoading,
    isRefetching,
    isSuccess,
    isError,
    refetch,
  };
}
