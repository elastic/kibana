/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FilterStateStore } from '@kbn/es-query';
import { useUrlState } from '@kbn/observability-shared-plugin/public';
import { enumeration } from '@kbn/securitysolution-io-ts-types';
import { fold } from 'fp-ts/lib/Either';
import { constant, identity } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';
import * as t from 'io-ts';
import { useReducer } from 'react';
import deepEqual from 'fast-deep-equal';

const FilterRT = t.intersection([
  t.type({
    meta: t.partial({
      alias: t.union([t.null, t.string]),
      disabled: t.boolean,
      negate: t.boolean,
      controlledBy: t.string,
      group: t.string,
      index: t.string,
      isMultiIndex: t.boolean,
      type: t.string,
      key: t.string,
      params: t.any,
      value: t.any,
    }),
  }),
  t.partial({
    query: t.record(t.string, t.any),
    $state: t.type({
      store: enumeration('FilterStateStore', FilterStateStore),
    }),
  }),
]);
const FiltersRT = t.array(FilterRT);

const QueryStateRT = t.type({
  language: t.string,
  query: t.union([t.string, t.record(t.string, t.any)]),
});

const SearchStateRT = t.type({
  panelFilters: FiltersRT,
  filters: FiltersRT,
  query: QueryStateRT,
});

const encodeUrlState = SearchStateRT.encode;
const decodeUrlState = (value: unknown) => {
  return pipe(SearchStateRT.decode(value), fold(constant(undefined), identity));
};

type SearchState = t.TypeOf<typeof SearchStateRT>;

const INITIAL_VALUE: SearchState = {
  query: { language: 'kuery', query: '' },
  panelFilters: [],
  filters: [],
};

export type StateAction =
  | { type: 'SET_FILTERS'; filters: SearchState['filters'] }
  | { type: 'SET_QUERY'; query: SearchState['query'] }
  | { type: 'SET_PANEL_FILTERS'; panelFilters: SearchState['panelFilters'] };

const reducer = (state: SearchState, action: StateAction): SearchState => {
  switch (action.type) {
    case 'SET_FILTERS':
      return { ...state, filters: action.filters };
    case 'SET_QUERY':
      return { ...state, query: action.query };
    case 'SET_PANEL_FILTERS':
      return { ...state, panelFilters: action.panelFilters };
    default:
      return state;
  }
};

export function useUnifiedSearchUrl() {
  const [urlState, setUrlState] = useUrlState<SearchState>({
    defaultState: INITIAL_VALUE,
    decodeUrlState,
    encodeUrlState,
    urlStateKey: '_a',
    writeDefaultState: true,
  });

  const [searchState, setSearchState] = useReducer(reducer, urlState);

  if (!deepEqual(searchState, urlState)) {
    setUrlState(searchState);
  }

  return { searchState, setSearchState };
}
