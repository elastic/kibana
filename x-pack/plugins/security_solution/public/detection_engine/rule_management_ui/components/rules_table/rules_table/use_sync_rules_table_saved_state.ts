/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { RULES_TABLE_STATE_STORAGE_KEY } from '../../../../../../common/constants';
import { useKibana } from '../../../../../common/lib/kibana';
import { URL_PARAM_KEY } from '../../../../../common/hooks/use_url_state';
import { useUpdateUrlParam } from '../../../../../common/utils/global_query_string';
import { AllRulesTabs } from '../rules_table_toolbar';

import { useRulesTableContext } from './rules_table_context';
import type { RulesTableSavedState } from './rules_table_saved_state';

export function useSyncRulesTableSavedState(activeTab: AllRulesTabs): void {
  const { state } = useRulesTableContext();
  const {
    services: { storage },
  } = useKibana();
  const updateUrlParam = useUpdateUrlParam<RulesTableSavedState>(URL_PARAM_KEY.rulesTable);

  useEffect(() => {
    const savedState: RulesTableSavedState = {
      filter: state.filterOptions,
      inMemory: state.isInMemorySorting,
      sort: state.sortingOptions,
      page: state.pagination.page,
      perPage: state.pagination.perPage,
    };

    if (activeTab === AllRulesTabs.monitoring) {
      savedState.tab = activeTab;
    }

    updateUrlParam(savedState);
    storage.set(RULES_TABLE_STATE_STORAGE_KEY, savedState);
  }, [updateUrlParam, storage, state, activeTab]);
}
