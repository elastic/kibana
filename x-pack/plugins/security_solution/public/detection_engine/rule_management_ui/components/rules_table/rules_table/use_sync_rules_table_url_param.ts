/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect } from 'react';
import { RULE_TABLE_STATE_STORAGE_KEY } from '../../../../../../common/constants';
import { useKibana } from '../../../../../common/lib/kibana';
import { URL_PARAM_KEY } from '../../../../../common/hooks/use_url_state';
import {
  useInitializeUrlParam,
  useUpdateUrlParam,
} from '../../../../../common/utils/global_query_string';
import type { FilterOptions, SortingOptions } from '../../../../rule_management/logic/types';
import { useRulesTableContext } from './rules_table_context';

interface RulesTableSavedState {
  isInMemorySorting: boolean;
  filterOptions: FilterOptions;
  sorting: SortingOptions;
  page: number;
  perPage: number;
}

export function useSyncRulesTableUrlParam(): void {
  const { state, actions } = useRulesTableContext();
  const {
    services: { storage },
  } = useKibana();

  const onInitializeRulesTableContextFromUrlParam = useCallback(
    (params: RulesTableSavedState | null) => {
      const savedState: Partial<RulesTableSavedState> = storage.get(RULE_TABLE_STATE_STORAGE_KEY);

      if (!params && !savedState) {
        return;
      }

      const isInMemorySorting = params?.isInMemorySorting ?? savedState.isInMemorySorting;
      const filterOptions = params?.filterOptions ?? savedState.filterOptions;
      const sorting = params?.sorting ?? savedState.sorting;
      const page = params?.page ?? savedState.page;
      const perPage = params?.perPage ?? savedState.perPage;

      if (isInMemorySorting !== undefined) {
        actions.setIsInMemorySorting(isInMemorySorting);
      }

      if (filterOptions !== undefined) {
        actions.setFilterOptions(filterOptions);
      }

      if (sorting && sorting.field && sorting.order) {
        actions.setSortingOptions(sorting);
      }

      if (page) {
        actions.setPage(page);
      }

      if (perPage) {
        actions.setPerPage(perPage);
      }
    },
    [actions, storage]
  );

  useInitializeUrlParam(URL_PARAM_KEY.rulesTable, onInitializeRulesTableContextFromUrlParam);
  const updateUrlParam = useUpdateUrlParam<RulesTableSavedState>(URL_PARAM_KEY.rulesTable);

  useEffect(() => {
    const savedState: RulesTableSavedState = {
      filterOptions: state.filterOptions,
      isInMemorySorting: state.isInMemorySorting,
      sorting: state.sortingOptions,
      page: state.pagination.page,
      perPage: state.pagination.perPage,
    };

    updateUrlParam(savedState);

    storage.set(RULE_TABLE_STATE_STORAGE_KEY, savedState);
  }, [updateUrlParam, storage, state]);
}
