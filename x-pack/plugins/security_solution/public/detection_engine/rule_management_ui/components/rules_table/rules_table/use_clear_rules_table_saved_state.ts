/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useReplaceUrlParams } from '../../../../../common/utils/global_query_string/helpers';
import { useKibana } from '../../../../../common/lib/kibana';
import { URL_PARAM_KEY } from '../../../../../common/hooks/use_url_state';
import { RULES_TABLE_STATE_STORAGE_KEY } from '../constants';
import { useRulesTableContext } from './rules_table_context';
import {
  DEFAULT_FILTER_OPTIONS,
  DEFAULT_PAGE,
  DEFAULT_RULES_PER_PAGE,
  DEFAULT_SORTING_OPTIONS,
} from './rules_table_defaults';

export function useClearRulesTableSavedState(): () => void {
  const {
    services: { sessionStorage },
  } = useKibana();
  const replaceUrlParams = useReplaceUrlParams();
  const { actions } = useRulesTableContext();

  return useCallback(() => {
    actions.setFilterOptions({
      filter: DEFAULT_FILTER_OPTIONS.filter,
      showElasticRules: DEFAULT_FILTER_OPTIONS.showElasticRules,
      showCustomRules: DEFAULT_FILTER_OPTIONS.showCustomRules,
      tags: DEFAULT_FILTER_OPTIONS.tags,
      enabled: undefined,
    });
    actions.setSortingOptions({
      field: DEFAULT_SORTING_OPTIONS.field,
      order: DEFAULT_SORTING_OPTIONS.order,
    });
    actions.setPage(DEFAULT_PAGE);
    actions.setPerPage(DEFAULT_RULES_PER_PAGE);

    replaceUrlParams({ [URL_PARAM_KEY.rulesTable]: null });
    sessionStorage.remove(RULES_TABLE_STATE_STORAGE_KEY);
  }, [replaceUrlParams, sessionStorage, actions]);
}
