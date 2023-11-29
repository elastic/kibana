/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import deepmerge from 'deepmerge';
import { useHistory } from 'react-router-dom';
import type { SortField, ViewMode } from '../components/slo_list_search_bar';

export const SLO_LIST_SEARCH_URL_STORAGE_KEY = 'search';

export interface SearchState {
  kqlQuery: string;
  page: number;
  sort: {
    by: SortField;
    direction: 'asc' | 'desc';
  };
  viewMode: ViewMode;
}

export const DEFAULT_STATE = {
  kqlQuery: '',
  page: 0,
  sort: { by: 'status' as const, direction: 'desc' as const },
  viewMode: 'compact' as const,
};

export function useUrlSearchState(): {
  state: SearchState;
  store: (state: Partial<SearchState>) => Promise<string | undefined>;
} {
  const history = useHistory();
  const urlStateStorage = createKbnUrlStateStorage({
    history,
    useHash: false,
    useHashQuery: false,
  });

  const searchState =
    urlStateStorage.get<SearchState>(SLO_LIST_SEARCH_URL_STORAGE_KEY) ?? DEFAULT_STATE;

  return {
    state: deepmerge(DEFAULT_STATE, searchState),
    store: (state: Partial<SearchState>) =>
      urlStateStorage.set(SLO_LIST_SEARCH_URL_STORAGE_KEY, deepmerge(searchState, state), {
        replace: true,
      }),
  };
}
