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
import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_SLO_PAGE_SIZE } from '../../../../common/constants';
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
  onStateChange: (state: Partial<SearchState>) => void;
} {
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
    const sub = urlStateStorage.current
      ?.change$<SearchState>(SLO_LIST_SEARCH_URL_STORAGE_KEY)
      .subscribe((newSearchState) => {
        if (newSearchState) {
          setState(newSearchState);
        }
      });

    setState(
      urlStateStorage.current?.get<SearchState>(SLO_LIST_SEARCH_URL_STORAGE_KEY) ?? DEFAULT_STATE
    );

    return () => {
      sub?.unsubscribe();
    };
  }, [urlStateStorage]);

  const onStateChange = useCallback(
    (newState: Partial<SearchState>) => {
      const updatedState = { ...state, page: 0, ...newState };
      setState((stateN) => updatedState);
      urlStateStorage.current?.set(SLO_LIST_SEARCH_URL_STORAGE_KEY, updatedState, {
        replace: true,
      });
    },
    [state]
  );

  return {
    state: deepmerge(DEFAULT_STATE, state),
    onStateChange,
  };
}
