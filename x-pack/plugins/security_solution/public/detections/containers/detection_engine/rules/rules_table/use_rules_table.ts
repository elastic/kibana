/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dispatch, useMemo, useReducer, useEffect, useRef } from 'react';
import { EuiBasicTable } from '@elastic/eui';

import { errorToToaster, useStateToaster } from '../../../../../common/components/toasters';
import * as i18n from '../translations';

import { fetchRules } from '../api';
import { createRulesTableReducer, RulesTableState, RulesTableAction } from './rules_table_reducer';
import { createRulesTableFacade, RulesTableFacade } from './rules_table_facade';
import { useFilteredRules } from './projections/filtering';
import { useSortedRules } from './projections/sorting';
import { usePaginatedRules, useDisplayedPaginationOptions } from './projections/pagination';

// Why these values?
// If we request more rules than 10000, we'll get an error from Elasticsearch (most likely).
//   https://www.elastic.co/guide/en/elasticsearch/reference/current/paginate-search-results.html
//   https://www.elastic.co/guide/en/elasticsearch/reference/current/index-modules.html#dynamic-index-settings
//   see `index.max_result_window`, default value is 10000.
// Example:
//   In requests like `GET my-index/_search?from=40&size=20` it's not about items per page,
//   but overall from+size count (requested page + all previous pages).
//   If max_result_window=10000 this will fail: `GET my-index/_search?from=9990&size=20`.
// We load "all" rules in memory at once. So, because we always request page=1:
const MAX_RULES_TO_LOAD = 10000; // must not be increased
const NUM_RULES_TO_LOAD = MAX_RULES_TO_LOAD / 2; // must be < MAX_RULES_TO_LOAD

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

  // Fetch all rules at once (and only once) after mount. Filtering, sorting,
  // searching and pagination are implemented in memory on the client side.
  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    const fetchData = async () => {
      try {
        facade.current.actionStarted('load', []);

        const fetchRulesResult = await fetchRules({
          filterOptions: initialStateDefaults.filterOptions,
          pagination: {
            page: 1,
            perPage: NUM_RULES_TO_LOAD,
            total: -1,
          },
          signal: abortCtrl.signal,
        });

        if (isSubscribed) {
          facade.current.setRules(fetchRulesResult.data, {
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
  }, []);

  const projections = useProjectedState(state);

  return {
    state: { ...state, ...projections },
    dispatch,
    ...facade.current,
    reFetchRules: reFetchRules.current,
  };
};

const useProjectedState = (state: RulesTableState): Partial<RulesTableState> => {
  const { rules, filterOptions, pagination } = state;

  const filteredRules = useFilteredRules(rules, filterOptions);
  const sortedRules = useSortedRules(filteredRules, filterOptions);
  const displayedPagination = useDisplayedPaginationOptions(sortedRules, pagination);
  const displayedRules = usePaginatedRules(sortedRules, displayedPagination);

  return {
    rules: displayedRules,
    pagination: displayedPagination,
  };
};
