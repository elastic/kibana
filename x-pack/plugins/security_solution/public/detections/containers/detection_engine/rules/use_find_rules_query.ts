/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useQuery, useQueryClient, UseQueryOptions } from 'react-query';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { fetchRules } from './api';
import * as i18n from './translations';
import { FilterOptions, PaginationOptions, Rule, SortingOptions } from './types';

export interface FindRulesQueryArgs {
  filterOptions?: FilterOptions;
  sortingOptions?: SortingOptions;
  pagination?: Pick<PaginationOptions, 'page' | 'perPage'>;
}

const FIND_RULES_QUERY_KEY = 'findRules';

export interface RulesQueryData {
  rules: Rule[];
  total: number;
}

/**
 * A wrapper around useQuery provides default values to the underlying query,
 * like query key, abortion signal, and error handler.
 *
 * @param queryPrefix - query prefix used to differentiate the query from other
 * findRules queries
 * @param queryArgs - fetch rules filters/pagination
 * @param queryOptions - react-query options
 * @returns useQuery result
 */
export const useFindRulesQuery = (
  queryPrefix: string[],
  queryArgs: FindRulesQueryArgs,
  queryOptions: UseQueryOptions<
    RulesQueryData,
    Error,
    RulesQueryData,
    [...string[], FindRulesQueryArgs]
  >
) => {
  const { addError } = useAppToasts();

  return useQuery(
    [FIND_RULES_QUERY_KEY, ...queryPrefix, queryArgs],
    async ({ signal }) => {
      const response = await fetchRules({ signal, ...queryArgs });

      return { rules: response.data, total: response.total };
    },
    {
      refetchIntervalInBackground: false,
      onError: (error: Error) => addError(error, { title: i18n.RULE_AND_TIMELINE_FETCH_FAILURE }),
      ...queryOptions,
    }
  );
};

/**
 * We should use this hook to invalidate the rules cache. For example, rule
 * mutations that affect rule set size, like creation or deletion, should lead
 * to cache invalidation.
 *
 * @returns A rules cache invalidation callback
 */
export const useInvalidateRules = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    /**
     * Invalidate all queries that start with FIND_RULES_QUERY_KEY. This
     * includes the in-memory query cache and paged query cache.
     */
    queryClient.invalidateQueries(FIND_RULES_QUERY_KEY, {
      refetchActive: true,
      refetchInactive: false,
    });
  }, [queryClient]);
};

/**
 * We should use this hook to update the rules cache when modifying rules
 * without changing the rules collection size. Use it with the new rules data
 * after operations like bulk or single rule edit or rule enabling, but not
 * when adding or removing rules. When adding/removing rules, we should
 * invalidate the cache instead.
 *
 * @returns A rules cache update callback
 */
export const useUpdateRulesCache = () => {
  const queryClient = useQueryClient();
  /**
   * Use this method to update rules data cached by react-query.
   * It is useful when we receive new rules back from a mutation query (bulk edit, etc.);
   * we can merge those rules with the existing cache to avoid an extra roundtrip to re-fetch updated rules.
   */
  return useCallback(
    (newRules: Rule[]) => {
      queryClient.setQueriesData<ReturnType<typeof useFindRulesQuery>['data']>(
        FIND_RULES_QUERY_KEY,
        (currentData) =>
          currentData
            ? {
                rules: updateRules(currentData.rules, newRules),
                total: currentData.total,
              }
            : undefined
      );
    },
    [queryClient]
  );
};

/**
 * Update cached rules with the new ones
 *
 * @param currentRules
 * @param newRules
 */
export function updateRules(currentRules: Rule[], newRules: Rule[]): Rule[] {
  const newRulesMap = new Map(newRules.map((rule) => [rule.id, rule]));

  if (currentRules.some((rule) => newRulesMap.has(rule.id))) {
    return currentRules.map((rule) => newRulesMap.get(rule.id) ?? rule);
  }

  return currentRules;
}
