/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect } from 'react';
import { URL_PARAM_KEY } from '../../../../../common/hooks/use_url_state';
import {
  useInitializeUrlParam,
  useUpdateUrlParam,
} from '../../../../../common/utils/global_query_string';
import type { FilterOptions, SortingOptions } from '../../../../rule_management/logic/types';
import { useRulesTableContext } from './rules_table_context';

interface RulesTableUrlParam {
  isInMemorySorting: boolean;
  filterOptions: FilterOptions;
  sorting: SortingOptions;
  page: number;
  perPage: number;
}

export function useSyncRulesTableUrlParam(): void {
  const { state, actions } = useRulesTableContext();

  const onInitializeRulesTableContextFromUrlParam = useCallback(
    (params: RulesTableUrlParam | null) => {
      if (!params) {
        return;
      }

      actions.setIsInMemorySorting(params.isInMemorySorting);
      actions.setFilterOptions(params.filterOptions);

      if (params.sorting && params.sorting.field && params.sorting.order) {
        actions.setSortingOptions(params.sorting);
      }

      actions.setPage(params.page);
      actions.setPerPage(params.perPage);
    },
    [actions]
  );

  useInitializeUrlParam(URL_PARAM_KEY.rulesTable, onInitializeRulesTableContextFromUrlParam);
  const updateUrlParam = useUpdateUrlParam<RulesTableUrlParam>(URL_PARAM_KEY.rulesTable);

  useEffect(() => {
    updateUrlParam({
      filterOptions: state.filterOptions,
      isInMemorySorting: state.isInMemorySorting,
      sorting: state.sortingOptions,
      page: state.pagination.page,
      perPage: state.pagination.perPage,
    });
  }, [updateUrlParam, state]);
}
