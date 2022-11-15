/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { RULE_TABLE_STATE_STORAGE_KEY } from '../../../../../../common/constants';
import { useKibana } from '../../../../../common/lib/kibana';
import { URL_PARAM_KEY } from '../../../../../common/hooks/use_url_state';
import { useInitializeUrlParam } from '../../../../../common/utils/global_query_string';
import { AllRulesTabs } from '../rules_table_toolbar';

import { useRulesTableContext } from './rules_table_context';
import type { RulesTableSavedState } from './rules_table_saved_state';

export function useInitializeRulesTableSavedState(setActiveTab: (tab: AllRulesTabs) => void): void {
  const { actions } = useRulesTableContext();
  const {
    services: { storage },
  } = useKibana();
  const onInitializeRulesTableContextFromUrlParam = useCallback(
    (params: RulesTableSavedState | null) => {
      const savedState: Partial<RulesTableSavedState> = storage.get(RULE_TABLE_STATE_STORAGE_KEY);

      if (!params && !savedState) {
        return;
      }

      const activeTab = params?.tab ?? savedState.tab;
      const isInMemorySorting = params?.inMemory ?? savedState.inMemory;
      const filterOptions = params?.filter ?? savedState.filter;
      const sorting = params?.sort ?? savedState.sort;
      const page = params?.page ?? savedState.page;
      const perPage = params?.perPage ?? savedState.perPage;

      if (activeTab === AllRulesTabs.monitoring) {
        setActiveTab(activeTab);
      }

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
    [actions, storage, setActiveTab]
  );

  useInitializeUrlParam(URL_PARAM_KEY.rulesTable, onInitializeRulesTableContextFromUrlParam);
}
