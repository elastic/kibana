/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import {
  encodeRisonUrlState,
  useReplaceUrlParams,
} from '../../../../../common/utils/global_query_string/helpers';
import { useKibana } from '../../../../../common/lib/kibana';
import { URL_PARAM_KEY } from '../../../../../common/hooks/use_url_state';
import { RULES_TABLE_STATE_STORAGE_KEY } from '../constants';
import { useRulesTableContext } from './rules_table_context';
import type {
  RulesTableStorageSavedState,
  RulesTableUrlSavedState,
} from './rules_table_saved_state';
import { RuleSource } from './rules_table_saved_state';
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
  const replaceUrlParams = useReplaceUrlParams();

  useEffect(() => {
    const urlStateToSave: RulesTableUrlSavedState = {};
    const storageStateToSave: RulesTableStorageSavedState = {};

    if (state.filterOptions.filter.length > 0) {
      urlStateToSave.searchTerm = state.filterOptions.filter;
      storageStateToSave.searchTerm = state.filterOptions.filter;
    }

    if (state.filterOptions.showElasticRules || state.filterOptions.showCustomRules) {
      const source = state.filterOptions.showCustomRules ? RuleSource.Custom : RuleSource.Prebuilt;

      urlStateToSave.source = source;
      storageStateToSave.source = source;
    }

    if (state.filterOptions.tags.length > 0) {
      urlStateToSave.tags = state.filterOptions.tags;
      storageStateToSave.tags = state.filterOptions.tags;
    }

    if (state.sortingOptions.field !== DEFAULT_SORTING_OPTIONS.field) {
      urlStateToSave.field = state.sortingOptions.field;
      storageStateToSave.field = state.sortingOptions.field;
    }

    if (state.sortingOptions.order !== DEFAULT_SORTING_OPTIONS.order) {
      urlStateToSave.order = state.sortingOptions.order;
      storageStateToSave.order = state.sortingOptions.order;
    }

    if (state.pagination.page !== DEFAULT_PAGE) {
      urlStateToSave.page = state.pagination.page;
    }

    if (state.pagination.perPage !== DEFAULT_RULES_PER_PAGE) {
      urlStateToSave.perPage = state.pagination.perPage;
      storageStateToSave.perPage = state.pagination.perPage;
    }

    const hasUrlStateToSave = Object.keys(urlStateToSave).length > 0;
    const hasStorageStateToSave = Object.keys(storageStateToSave).length > 0;

    if (!hasUrlStateToSave) {
      replaceUrlParams([{ key: URL_PARAM_KEY.rulesTable, value: null }]);
    }

    if (!hasStorageStateToSave) {
      sessionStorage.remove(RULES_TABLE_STATE_STORAGE_KEY);
    }

    if (!hasUrlStateToSave && !hasStorageStateToSave) {
      return;
    }

    replaceUrlParams([
      { key: URL_PARAM_KEY.rulesTable, value: encodeRisonUrlState(urlStateToSave) },
    ]);
    sessionStorage.set(RULES_TABLE_STATE_STORAGE_KEY, storageStateToSave);
  }, [replaceUrlParams, sessionStorage, state]);
}
