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
import type { FilterOptions } from '../../../../rule_management/logic/types';
import { useRulesTableContext } from './rules_table_context';

interface RulesTableUrlParam {
  filterOptions: FilterOptions;
}

export function useSyncRulesTableUrlParam(): void {
  const { state, actions } = useRulesTableContext();

  const onInitializeRulesTableContextFromUrlParam = useCallback(
    (params: RulesTableUrlParam | null) => {
      if (!params) {
        return;
      }

      actions.setFilterOptions(params.filterOptions);
    },
    [actions]
  );

  useInitializeUrlParam(URL_PARAM_KEY.rulesTable, onInitializeRulesTableContextFromUrlParam);
  const updateUrlParam = useUpdateUrlParam<RulesTableUrlParam>(URL_PARAM_KEY.rulesTable);

  useEffect(() => {
    updateUrlParam({
      filterOptions: state.filterOptions,
    });
  }, [updateUrlParam, state]);
}
