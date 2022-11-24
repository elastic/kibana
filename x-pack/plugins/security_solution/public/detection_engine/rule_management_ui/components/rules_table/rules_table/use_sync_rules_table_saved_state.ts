/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useKibana } from '../../../../../common/lib/kibana';
import { URL_PARAM_KEY } from '../../../../../common/hooks/use_url_state';
import { useUpdateUrlParam } from '../../../../../common/utils/global_query_string';
import { RULES_TABLE_STATE_STORAGE_KEY } from '../constants';
import { useRulesTableContext } from './rules_table_context';
import type { RulesTableSavedState } from './rules_table_saved_state';
import {
  DEFAULT_PAGE,
  DEFAULT_RULES_PER_PAGE,
  DEFAULT_SORTING_OPTIONS,
} from './rules_table_defaults';

export function useSyncRulesTableSavedState(): void {
  const { state } = useRulesTableContext();
  const {
    services: { sessionStorage },
  } = useKibana();
  const updateUrlParam = useUpdateUrlParam<RulesTableSavedState>(URL_PARAM_KEY.rulesTable);

  useEffect(() => {
    const savedState: RulesTableSavedState = {};

    if (state.filterOptions.filter.length > 0) {
      savedState.searchTerm = state.filterOptions.filter;
    }

    if (state.filterOptions.showElasticRules || state.filterOptions.showCustomRules) {
      savedState.showCustomRules = state.filterOptions.showCustomRules;
    }

    if (state.filterOptions.tags.length > 0) {
      savedState.tags = state.filterOptions.tags;
    }

    if (state.sortingOptions.field !== DEFAULT_SORTING_OPTIONS.field) {
      savedState.sort = { field: state.sortingOptions.field };
    }

    if (state.sortingOptions.order !== DEFAULT_SORTING_OPTIONS.order) {
      savedState.sort = { ...savedState.sort, order: state.sortingOptions.order };
    }

    if (state.pagination.page !== DEFAULT_PAGE) {
      savedState.page = state.pagination.page;
    }

    if (state.pagination.perPage !== DEFAULT_RULES_PER_PAGE) {
      savedState.perPage = state.pagination.perPage;
    }

    if (Object.keys(savedState).length === 0) {
      updateUrlParam(null);
      sessionStorage.remove(RULES_TABLE_STATE_STORAGE_KEY);

      return;
    }

    updateUrlParam(savedState);
    sessionStorage.set(RULES_TABLE_STATE_STORAGE_KEY, savedState);
  }, [updateUrlParam, sessionStorage, state]);
}
