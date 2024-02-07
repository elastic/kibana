/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import deepmerge from 'deepmerge';
import { useHistory } from 'react-router-dom';
import { Filter } from '@kbn/es-query';
import { useEffect, useRef, useState } from 'react';
import { useKibana } from '../../../utils/kibana_react';
import { ObservabilityPublicPluginsStart } from '../../..';
import { DEFAULT_SLO_PAGE_SIZE } from '../../../../common/slo/constants';
import type { SortField, SortDirection } from '../components/slo_list_search_bar';
import type { GroupByField } from '../components/slo_list_group_by';
import type { SLOView } from '../components/toggle_slo_view';

export const SLO_LIST_SEARCH_URL_STORAGE_KEY = 'search';

export interface SearchState {
  kqlQuery: string;
  page: number;
  perPage: number;
  sort: {
    by: SortField;
    direction: SortDirection;
  };
  view: SLOView;
  groupBy: GroupByField;
  filters: Filter[];
  lastRefresh?: number;
  tagsFilter?: Filter;
  statusFilter?: Filter;
}

export const DEFAULT_STATE = {
  kqlQuery: '',
  page: 0,
  perPage: DEFAULT_SLO_PAGE_SIZE,
  sort: { by: 'status' as const, direction: 'desc' as const },
  view: 'cardView' as const,
  groupBy: 'ungrouped' as const,
  filters: [],
  lastRefresh: 0,
};

export function useUrlSearchState(): {
  state: SearchState;
  store: (state: Partial<SearchState>) => void;
} {
  const {
    data: { query },
  } = useKibana<ObservabilityPublicPluginsStart>().services;

  const [state, setState] = useState<SearchState>(DEFAULT_STATE);
  const history = useHistory();
  const urlStateStorage = useRef(
    createKbnUrlStateStorage({
      history,
      useHash: false,
      useHashQuery: false,
    })
  );

  useEffect(() => {
    const currentState = urlStateStorage.current;

    const sub = currentState
      ?.change$<SearchState>(SLO_LIST_SEARCH_URL_STORAGE_KEY)
      .subscribe((newSearchState) => {
        if (newSearchState) {
          setState(newSearchState);
        }
      });
    const initState =
      currentState?.get<SearchState>(SLO_LIST_SEARCH_URL_STORAGE_KEY) ?? DEFAULT_STATE;
    setState(initState);

    if (initState.kqlQuery) {
      query.queryString.setQuery({
        query: initState.kqlQuery,
        language: 'kuery',
      });
    }
    if (initState.filters && initState.filters.length > 0) {
      query.filterManager.setFilters(initState.filters);
    }

    return () => {
      sub?.unsubscribe();
    };
  }, [query.filterManager, query.queryString, urlStateStorage]);
  return {
    state: deepmerge(DEFAULT_STATE, state),
    store: (newState: Partial<SearchState>) => {
      setState((stateN) => ({ ...stateN, ...newState }));
      urlStateStorage.current?.set(
        SLO_LIST_SEARCH_URL_STORAGE_KEY,
        { ...state, ...newState },
        {
          replace: true,
        }
      );
    },
  };
}
