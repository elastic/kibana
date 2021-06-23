/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Dispatch, useReducer, useEffect, useRef } from 'react';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
import * as i18n from '../translations';
import { fetchRules } from '../api';
import { rulesTableReducer, RulesTableState, RulesTableAction } from './rules_table_reducer';
import { createRulesTableFacade, RulesTableFacade } from './rules_table_facade';

const INITIAL_SORT_FIELD = 'enabled';

const initialStateDefaults: RulesTableState = {
  rules: [],
  pagination: {
    page: 1,
    perPage: 20,
    total: 0,
  },
  filterOptions: {
    filter: '',
    sortField: INITIAL_SORT_FIELD,
    sortOrder: 'desc',
    tags: [],
    showCustomRules: false,
    showElasticRules: false,
  },
  loadingRulesAction: null,
  loadingRuleIds: [],
  selectedRuleIds: [],
  lastUpdated: 0,
  isRefreshOn: true,
  isRefreshing: false,
  isAllSelected: false,
  showIdleModal: false,
};

export interface UseRulesTableParams {
  initialStateOverride?: Partial<RulesTableState>;
}

export interface UseRulesTableReturn extends RulesTableFacade {
  state: RulesTableState;
  dispatch: Dispatch<RulesTableAction>;
  reFetchRules: () => Promise<void>;
}

export const useRulesTable = (params: UseRulesTableParams): UseRulesTableReturn => {
  const { initialStateOverride } = params;

  const initialState: RulesTableState = {
    ...initialStateDefaults,
    lastUpdated: Date.now(),
    ...initialStateOverride,
  };

  const [state, dispatch] = useReducer(rulesTableReducer, initialState);
  const facade = useRef(createRulesTableFacade(dispatch));
  const { addError } = useAppToasts();

  const reFetchRules = useRef<() => Promise<void>>(() => Promise.resolve());

  const { pagination, filterOptions } = state;
  const filterTags = filterOptions.tags.sort().join();

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    const fetchData = async () => {
      try {
        facade.current.actionStarted('load', []);

        const fetchRulesResult = await fetchRules({
          filterOptions,
          pagination,
          signal: abortCtrl.signal,
        });

        if (isSubscribed) {
          facade.current.setRules(fetchRulesResult.data, {
            page: fetchRulesResult.page,
            perPage: fetchRulesResult.perPage,
            total: fetchRulesResult.total,
          });
        }
      } catch (error) {
        if (isSubscribed) {
          addError(error, { title: i18n.RULE_AND_TIMELINE_FETCH_FAILURE });
          facade.current.setRules([], {});
        }
      }
      if (isSubscribed) {
        facade.current.actionStopped();
      }
    };

    fetchData();
    reFetchRules.current = () => fetchData();

    return () => {
      isSubscribed = false;
      abortCtrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pagination.page,
    pagination.perPage,
    filterOptions.filter,
    filterOptions.sortField,
    filterOptions.sortOrder,
    filterTags,
    filterOptions.showCustomRules,
    filterOptions.showElasticRules,
  ]);

  return {
    state,
    dispatch,
    ...facade.current,
    reFetchRules: reFetchRules.current,
  };
};
