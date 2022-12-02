/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useGetInitialUrlParamValue } from '../../../../../common/utils/global_query_string/helpers';
import { RULES_TABLE_MAX_PAGE_SIZE } from '../../../../../../common/constants';
import { useKibana } from '../../../../../common/lib/kibana';
import { URL_PARAM_KEY } from '../../../../../common/hooks/use_url_state';
import { RULES_TABLE_STATE_STORAGE_KEY } from '../constants';
import { useRulesTableContext } from './rules_table_context';
import type { RulesTableSavedState } from './rules_table_saved_state';
import { RuleSource } from './rules_table_saved_state';
import { DEFAULT_FILTER_OPTIONS, DEFAULT_SORTING_OPTIONS } from './rules_table_defaults';

export function useInitializeRulesTableSavedState(): void {
  const getUrlParam = useGetInitialUrlParamValue<RulesTableSavedState>(URL_PARAM_KEY.rulesTable);
  const { actions } = useRulesTableContext();
  const {
    services: { sessionStorage },
  } = useKibana();

  useEffect(() => {
    const { decodedParam: urlState } = getUrlParam();

    const storageState: Partial<RulesTableSavedState> | null = sessionStorage.get(
      RULES_TABLE_STATE_STORAGE_KEY
    );

    if (!urlState && !storageState) {
      return;
    }

    const searchTerm = urlState?.searchTerm ?? storageState?.searchTerm;
    const ruleSource = urlState?.source ?? storageState?.source;
    const tags = urlState?.tags ?? storageState?.tags;
    const sorting = urlState?.sort ?? storageState?.sort;
    const page = urlState?.page ?? storageState?.page;
    const perPage = urlState?.perPage ?? storageState?.perPage;

    actions.setFilterOptions({
      filter: typeof searchTerm === 'string' ? searchTerm : DEFAULT_FILTER_OPTIONS.filter,
      showElasticRules: ruleSource === RuleSource.Prebuilt,
      showCustomRules: ruleSource === RuleSource.Custom,
      tags: Array.isArray(tags) ? tags : DEFAULT_FILTER_OPTIONS.tags,
    });

    if (sorting) {
      actions.setSortingOptions({
        field: sorting.field ?? DEFAULT_SORTING_OPTIONS.field,
        order: sorting.order ?? DEFAULT_SORTING_OPTIONS.order,
      });
    }

    if (page) {
      actions.setPage(page);
    }

    if (perPage && perPage > 0 && perPage <= RULES_TABLE_MAX_PAGE_SIZE) {
      actions.setPerPage(perPage);
    }
  }, [getUrlParam, actions, sessionStorage]);
}
