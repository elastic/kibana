/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { buildEsQuery, FilterStateStore, type Query } from '@kbn/es-query';
import { useUrlState } from '@kbn/observability-shared-plugin/public';
import { enumeration } from '@kbn/securitysolution-io-ts-types';
import deepEqual from 'fast-deep-equal';
import { fold } from 'fp-ts/lib/Either';
import { constant, identity } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';
import * as t from 'io-ts';
import { useEffect, useMemo } from 'react';
import useEffectOnce from 'react-use/lib/useEffectOnce';
import { map, Subscription, tap } from 'rxjs';
import { useInventorySearchBarContext } from '../context/inventory_search_bar_context_provider';
import { useKibana } from './use_kibana';

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
  controlFilters: FiltersRT,
  filters: FiltersRT,
  query: QueryStateRT,
});

export const encodeUrlState = SearchStateRT.encode;
const decodeUrlState = (value: unknown) => {
  return pipe(SearchStateRT.decode(value), fold(constant(undefined), identity));
};

type SearchState = t.TypeOf<typeof SearchStateRT>;

const INITIAL_VALUE: SearchState = {
  query: { language: 'kuery', query: '' },
  controlFilters: [],
  filters: [],
};

export function useUnifiedSearch() {
  const {
    services: {
      data: {
        query: { filterManager: filterManagerService, queryString: queryStringService },
      },
    },
  } = useKibana();

  const [searchState, setSearchState] = useUrlState<SearchState>({
    defaultState: INITIAL_VALUE,
    decodeUrlState,
    encodeUrlState,
    urlStateKey: '_a',
    writeDefaultState: true,
  });
  const { dataView } = useInventorySearchBarContext();

  useEffectOnce(() => {
    if (!deepEqual(filterManagerService.getFilters(), searchState.filters)) {
      filterManagerService.setFilters(
        searchState.filters.map((item) => ({
          ...item,
          meta: { ...item.meta, index: dataView?.id },
        }))
      );
    }

    if (!deepEqual(queryStringService.getQuery(), searchState.query)) {
      queryStringService.setQuery(searchState.query);
    }
  });

  useEffect(() => {
    const subscription = new Subscription();
    subscription.add(
      filterManagerService
        .getUpdates$()
        .pipe(
          map(() => filterManagerService.getFilters()),
          tap((filters) => setSearchState((state) => ({ ...state, filters })))
        )
        .subscribe()
    );

    subscription.add(
      queryStringService
        .getUpdates$()
        .pipe(
          map(() => queryStringService.getQuery() as Query),
          tap((query) => setSearchState((state) => ({ ...state, query })))
        )
        .subscribe()
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [filterManagerService, queryStringService, setSearchState]);

  const stringifiedEsQuery = useMemo(() => {
    if (dataView) {
      return JSON.stringify(
        buildEsQuery(dataView, searchState.query, [
          ...searchState.controlFilters,
          ...searchState.filters,
        ])
      );
    }
  }, [dataView, searchState.controlFilters, searchState.filters, searchState.query]);

  return {
    searchState,
    setSearchState,
    stringifiedEsQuery,
  };
}
