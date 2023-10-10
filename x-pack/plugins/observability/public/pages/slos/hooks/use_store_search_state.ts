/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useHistory } from 'react-router-dom';
import { createKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import deepmerge from 'deepmerge';
import { SortField } from '../components/slo_list_search_filter_sort_bar';

export interface SearchState {
  kqlQuery: string;
  page: number;
  sort: {
    by: SortField;
    direction: 'asc' | 'desc';
  };
}

const DEFAULT_STATE = {
  kqlQuery: '',
  page: 0,
  sort: { by: 'status' as const, direction: 'desc' as const },
};

export function useStoreSearchState(): { state: SearchState } {
  const history = useHistory();
  const urlStateStorage = createKbnUrlStateStorage({
    history,
    useHash: false,
    useHashQuery: false,
  });

  const searchState = urlStateStorage.get<SearchState>('changeme') ?? DEFAULT_STATE;

  return { state: deepmerge(DEFAULT_STATE, searchState) };
}
