/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Dispatch, useMemo, useReducer, useEffect, useRef } from 'react';
import { EuiBasicTable } from '@elastic/eui';

import { errorToToaster, useStateToaster } from '../../../../../common/components/toasters';
import * as i18n from '../translations';

import { fetchRules } from '../api';
import { createRulesTableReducer, RulesTableState, RulesTableAction } from './rules_table_reducer';
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
  exportRuleIds: [],
  lastUpdated: 0,
  isRefreshOn: true,
  showIdleModal: false,
};

export interface UseRulesTableParams {
  tableRef: React.MutableRefObject<EuiBasicTable<unknown> | undefined>;
  initialStateOverride?: Partial<RulesTableState>;
}

export interface UseRulesTableReturn extends RulesTableFacade {
  state: RulesTableState;
  dispatch: Dispatch<RulesTableAction>;
  reFetchRules: () => Promise<void>;
}

export const useRulesTable = (params: UseRulesTableParams): UseRulesTableReturn => {
  const { tableRef, initialStateOverride } = params;

  const initialState: RulesTableState = {
    ...initialStateDefaults,
    lastUpdated: Date.now(),
    ...initialStateOverride,
  };

  const reducer = useMemo(() => createRulesTableReducer(tableRef), [tableRef]);
  const [state, dispatch] = useReducer(reducer, initialState);
  const facade = useRef(createRulesTableFacade(dispatch));

  const reFetchRules = useRef<() => Promise<void>>(() => Promise.resolve());
  const [, dispatchToaster] = useStateToaster();

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
          errorToToaster({ title: i18n.RULE_AND_TIMELINE_FETCH_FAILURE, error, dispatchToaster });
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
