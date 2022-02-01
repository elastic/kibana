/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { QueryKey, useQuery, useQueryClient, UseQueryOptions } from 'react-query';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
import { fetchRules } from '../api';
import * as i18n from '../translations';
import { FilterOptions, PaginationOptions, Rule, SortingOptions } from '../types';

interface FindRulesQueryArgs {
  filterOptions?: FilterOptions;
  sortingOptions?: SortingOptions;
  pagination?: Pick<PaginationOptions, 'page' | 'perPage'>;
}

interface UseFindRulesArgs extends FindRulesQueryArgs {
  isInMemorySorting: boolean;
  refetchInterval: number | false;
}

const MAX_RULES_PER_PAGE = 10000;
const FIND_RULES_QUERY_KEY = 'findRules';

/**
 * This hook is used to fetch detection rules. Under the hood, it implements a
 * "feature switch" that allows switching from an in-memory implementation to a
 * backend-based implementation on the fly.
 *
 * @param args - find rules arguments
 * @returns rules query result
 */
export const useFindRules = (args: UseFindRulesArgs) => {
  const { pagination, filterOptions, sortingOptions, isInMemorySorting, refetchInterval } = args;

  // Use this query result when isInMemorySorting = true
  const allRules = useFindRulesQuery(
    getFindRulesQueryKey({ pagination, filterOptions, sortingOptions, isInMemorySorting: true }),
    { pagination: { page: 1, perPage: MAX_RULES_PER_PAGE } },
    { refetchInterval, enabled: isInMemorySorting }
  );

  // Use this query result when isInMemorySorting = false
  const pagedRules = useFindRulesQuery(
    getFindRulesQueryKey({ pagination, filterOptions, sortingOptions, isInMemorySorting: false }),
    { pagination, filterOptions, sortingOptions },
    {
      refetchInterval,
      enabled: !isInMemorySorting,
      keepPreviousData: true, // Use this option so that the state doesn't jump between "success" and "loading" on page change
    }
  );

  return isInMemorySorting ? allRules : pagedRules;
};

/**
 * A helper method used to construct a query key to be used as a cache key for
 * react-query
 *
 * @param args - query arguments
 * @returns Query key
 */
export const getFindRulesQueryKey = ({
  isInMemorySorting,
  filterOptions,
  sortingOptions,
  pagination,
}: FindRulesQueryArgs & Pick<UseFindRulesArgs, 'isInMemorySorting'>) =>
  isInMemorySorting
    ? [FIND_RULES_QUERY_KEY, 'all'] // For the in-memory implementation we fetch data only once and cache it, thus the key is constant and do not depend on input arguments
    : [FIND_RULES_QUERY_KEY, 'paged', filterOptions, sortingOptions, pagination];

interface RulesQueryData {
  rules: Rule[];
  total: number;
}

const useFindRulesQuery = (
  queryKey: QueryKey,
  queryArgs: FindRulesQueryArgs,
  queryOptions: UseQueryOptions<RulesQueryData, Error>
) => {
  const { addError } = useAppToasts();

  return useQuery(
    queryKey,
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
 * We should use this hook to invalidate the rules cache. Any rule mutation,
 * like creation, deletion, modification, or rule activation, should lead to
 * cache invalidation.
 *
 * We invalidate all rules cache entries for simplicity so that we don't need to
 * look for cache entries that contain mutated rules.
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
