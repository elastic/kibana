/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from 'react-query';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
import { fetchRules } from '../api';
import * as i18n from '../translations';
import { FilterOptions, PaginationOptions, SortingOptions } from '../types';

interface UseFindRulesArgs {
  enabled: boolean;
  isInMemorySorting: null | boolean;
  filterOptions: FilterOptions;
  sortingOptions: SortingOptions;
  pagination: Pick<PaginationOptions, 'page' | 'perPage'>;
  refetchInterval: number | false;
}

const MAX_RULES_PER_PAGE = 10000;

export const useFindRules = ({
  enabled,
  pagination,
  filterOptions,
  sortingOptions,
  isInMemorySorting,
  refetchInterval,
}: UseFindRulesArgs) => {
  const { addError } = useAppToasts();

  return useQuery(
    getFindRulesQueryKey({ pagination, filterOptions, sortingOptions, isInMemorySorting }),
    async ({ signal }) => {
      const { page, perPage } = pagination;

      const response = await fetchRules({
        signal,
        pagination: isInMemorySorting
          ? { page: 1, perPage: MAX_RULES_PER_PAGE }
          : { page, perPage },
        filterOptions: isInMemorySorting ? undefined : filterOptions,
        sortingOptions: isInMemorySorting ? undefined : sortingOptions,
      });

      return {
        rules: response.data,
        total: response.total,
      };
    },
    {
      enabled,
      refetchInterval,
      refetchIntervalInBackground: false,
      keepPreviousData: true, // Use this option so that the state doesn't jump between "success" and "loading" on page change
      staleTime: Infinity,
      onError: (error: Error) => addError(error, { title: i18n.RULE_AND_TIMELINE_FETCH_FAILURE }),
    }
  );
};

export const getFindRulesQueryKey = ({
  isInMemorySorting,
  filterOptions,
  sortingOptions,
  pagination,
}: Pick<
  UseFindRulesArgs,
  'isInMemorySorting' | 'filterOptions' | 'sortingOptions' | 'pagination'
>) =>
  isInMemorySorting
    ? ['findAllRules'] // For the in-memory implementation we fetch data only once and cache it, thus the key is constant and do not depend on input arguments
    : ['findAllRules', filterOptions, sortingOptions, pagination];
