/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { decode, encode } from 'rison-node';
import { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { useLocation, useHistory } from 'react-router-dom';
import { DataView, IKibanaSearchResponse, Filter } from '../../../../../../src/plugins/data/common';
import { SearchBarProps } from '../../../../../../src/plugins/data/public';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';

// TODO: find kibanas' equivalent fn
const isNonNullable = <T extends unknown>(v: T): v is NonNullable<T> =>
  v !== null && v !== undefined;

interface BaseFindingsSearchBarProps {
  dataView: DataView;
  onError(v: string): void;
  onSuccess(v: CSPFinding[]): void;
  onLoading(): void;
}

type FindingsSearchBarProps = BaseFindingsSearchBarProps & FetchState<CSPFinding[]>;

type URLState = Parameters<NonNullable<SearchBarProps['onQuerySubmit']>>[0];

const getDefaultQuery = (): Required<URLState> => ({
  query: { language: 'kuery', query: '' },
  dateRange: {
    from: 'now-15m',
    to: 'now',
  },
});

/**
 * Temporary Search Bar using x-pack/plugins/data
 *
 * TODO:
 *  - use SiemSearchBar / QueryBar or something else ?
 */
export const FindingsSearchBar = ({
  dataView,
  loading,
  onError,
  onLoading,
  onSuccess,
}: FindingsSearchBarProps) => {
  const { data: dataService } = useKibana().services;
  const [filters, setFilters] = useState<Filter[]>([]);
  const searchState = useSearchState();
  const history = useHistory();

  const {
    ui: { SearchBar },
    query,
    search,
  } = dataService;

  /*
   * This sends a query using esClient
   * TODO:
   * - AbortController
   */
  const runSearch = useCallback(async () => {
    if (!dataView) return;

    onLoading();

    query.queryString.setQuery(searchState.query || getDefaultQuery().query);

    const timefilter = query.timefilter.timefilter.createFilter(dataView, searchState.dateRange);

    query.filterManager.setFilters([...filters, timefilter].filter(isNonNullable));

    try {
      const findingsSearchSource = await search.searchSource.create({
        filter: query.filterManager.getFilters(),
        query: query.queryString.getQuery(),
        index: dataView.id,
        size: 1000, // TODO: async pagination
      });

      const findingsResponse: IKibanaSearchResponse<SearchResponse<CSPFinding>> =
        await findingsSearchSource.fetch$().toPromise();
      onSuccess(findingsResponse.rawResponse.hits.hits.map((v) => v._source).filter(isNonNullable));
    } catch (e) {
      onError(e);
    }
  }, [
    dataView,
    onLoading,
    query.queryString,
    query.timefilter.timefilter,
    query.filterManager,
    searchState.query,
    searchState.dateRange,
    filters,
    search.searchSource,
    onSuccess,
    onError,
  ]);

  /**
   * This changes the URL which triggers a new search
   * TODO:
   * - make filters part of the query
   */
  const handleQuerySubmit = useCallback(
    (v: URLState) => {
      // TODO: use util fn to build query (not with URLSearchParams as it escapes 'rison')
      const next = `source=${encode(v)}`;
      const current = history.location.search.slice(1);

      if (next === current) {
        // React Router won't trigger a component re-render if navigated to same path
        // so we call it directly
        runSearch();
      } else {
        history.push({ search: next });
      }
    },
    // TODO: verify history is memoed or make this a plain fn
    [history, runSearch]
  );

  useEffect(() => {
    runSearch();
  }, [runSearch]);

  if (!dataView) return null;

  return (
    <SearchBar
      showFilterBar={true}
      showDatePicker={true}
      showQueryBar={true}
      showQueryInput={true}
      showSaveQuery={true}
      isLoading={loading}
      indexPatterns={[dataView]}
      dateRangeFrom={searchState?.dateRange?.from}
      dateRangeTo={searchState?.dateRange?.to}
      query={searchState.query}
      onRefresh={runSearch}
      // 'onFiltersUpdated' is not on StatefulSearchBarProps
      // but needed to make timerange work
      // will be fixed once a search bar is picked
      // @ts-ignore
      onFiltersUpdated={setFilters}
      onQuerySubmit={handleQuerySubmit}
    />
  );
};

/**
 * Temp URL state utility
 * TODO: use x-pack/plugins/security_solution/public/common/components/url_state/index.tsx ?
 */
const useSearchState = () => {
  const loc = useLocation();
  const [state, set] = useState<URLState>(getDefaultQuery());

  useEffect(() => {
    const params = new URLSearchParams(loc.search);
    const source = params.get('source');
    if (!source) return;

    try {
      set(decode(source) as URLState);
    } catch (e) {
      set(getDefaultQuery());

      // TODO: use real logger
      // eslint-disable-next-line no-console
      console.log('Unable to decode URL');
    }
  }, [loc.search]);

  return state;
};
