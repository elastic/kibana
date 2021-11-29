/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { decode, encode } from 'rison-node';
import { SearchResponse, SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { useLocation, useHistory } from 'react-router-dom';
import {
  DataView,
  IKibanaSearchResponse,
  Filter,
  Query,
  TimeRange,
} from '../../../../../../../src/plugins/data/common';
import { SecuritySolutionPageWrapper } from '../../../common/components/page_wrapper';
import { HeaderPage } from '../../../common/components/header_page';
import { FindingsTable } from './findings_table';
import { useKibana } from '../../../common/lib/kibana';
import { CSPFinding } from './types';

// import { Filter, Query } from '@kbn/es-query';
// import { SpyRoute } from '../../../common/utils/route/spy_routes';
// import { CloudPosturePage } from '../../../app/types';
// import type { TimeRange } from '../../../../../../'
// import { makeMapStateToProps } from '../../../common/components/url_state/helpers';
// import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
// TODO: use urlState
// const urlMapState = makeMapStateToProps();
// const { urlState } = useDeepEqualSelector(urlMapState);

const KUBEBEAT_INDEX = 'kubebeat';

export const Findings = () => (
  <SecuritySolutionPageWrapper noPadding={false} data-test-subj="csp_rules">
    <HeaderPage border title={'Findings'} />
    <FindingsTableContainer />
    {/* <SpyRoute pageName={CloudPosturePage.findings} /> */}
  </SecuritySolutionPageWrapper>
);

interface URLState {
  query: Query;
  dateRange?: TimeRange;
}

// Temp URL state utility
const useSearchState = () => {
  const loc = useLocation();
  const [state, set] = useState<URLState>(DEFAULT_QUERY);

  useEffect(() => {
    const params = new URLSearchParams(loc.search);
    const query = params.get('query');
    const dateRange = params.get('dateRange');

    try {
      set({
        query: (query ? decode(query as string) : DEFAULT_QUERY.query) as Query,
        dateRange: (dateRange ? decode(dateRange as string) : undefined) as TimeRange,
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log('Unable to decode URL ');

      set({} as URLState);
    }
  }, [loc.search]);

  return state;
};

const DEFAULT_QUERY = {
  query: { language: 'kuery', query: '' },
  dateRange: undefined,
};

const createEntry = (v: SearchHit<CSPFinding>): CSPFinding => ({
  ...v,
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  ...v._source!,
});

// TODO: get it some other way
const useKubebeatDataView = () => {
  const [kubebeatDataView, setKubebeatDataView] = useState<DataView>();
  const {
    data: { dataViews },
  } = useKibana().services;
  useEffect(() => {
    if (!dataViews) return;
    (async () => setKubebeatDataView((await dataViews.find(KUBEBEAT_INDEX))?.[0]))();
  }, [dataViews]);
  return { kubebeatDataView };
};

const FindingsTableContainer = () => {
  const { data: dataService } = useKibana().services;
  const [filters, setFilters] = useState<Filter[]>([]);
  const [findings, setFindings] = useState<CSPFinding[]>();
  const [isLoading, setLoading] = useState<boolean>();
  const [isError, setError] = useState<string | undefined>(undefined);
  const { kubebeatDataView } = useKubebeatDataView();
  const searchState = useSearchState();

  const history = useHistory();
  const {
    ui: { SearchBar },
    query,
    search,
  } = dataService;

  const runSearch = useCallback(async () => {
    if (!kubebeatDataView) return;

    setError(undefined);
    setLoading(true);

    query.queryString.setQuery(searchState.query || DEFAULT_QUERY.query);

    const nextFilters = filters.slice();

    const timefilter =
      searchState?.dateRange &&
      query.timefilter.timefilter.createFilter(kubebeatDataView, searchState.dateRange);
    if (timefilter) {
      nextFilters.push(timefilter);
    }

    query.filterManager.setFilters(nextFilters);

    try {
      const findingsSearchSource = await search.searchSource.create({
        filter: query.filterManager.getFilters(),
        query: query.queryString.getQuery(),
        index: kubebeatDataView,
        // TODO: async pagination
        size: 1000,
      });

      const findingsResponse: IKibanaSearchResponse<SearchResponse<CSPFinding>> =
        await findingsSearchSource.fetch$().toPromise();

      setFindings(findingsResponse.rawResponse.hits.hits.map(createEntry));
    } catch (e) {
      if (!!e && e instanceof Error) setError(e.message);
      // eslint-disable-next-line no-console
      console.log('[CSP] failed to get data');
    }
    setLoading(false);
  }, [
    filters,
    kubebeatDataView,
    query.filterManager,
    query.queryString,
    query.timefilter.timefilter,
    search.searchSource,
    searchState.dateRange,
    searchState.query,
  ]);

  const handleQuerySubmit = useCallback(
    (v: URLState) => {
      const next = {
        search: new URLSearchParams(
          [
            ['query', encode(v.query)],
            ['dateRange', encode(v.dateRange)],
          ].filter((p) => !!p[1])
        ).toString(),
      };

      if (next.search === history.location.search.slice(1)) {
        // React Router won't trigger a component re-render if navigated to same path
        // so we call it directly
        runSearch();
      } else {
        history.push(next);
      }
    },
    [history, runSearch]
  );

  useEffect(() => {
    runSearch();
  }, [runSearch]);

  if (!kubebeatDataView || !findings) return null;

  // console.log({ searchState });
  return (
    <div style={{ height: '100%', width: '100%' }}>
      <SearchBar
        isLoading={isLoading}
        appName="foo"
        onRefresh={runSearch}
        dateRangeFrom={searchState?.dateRange?.from}
        dateRangeTo={searchState?.dateRange?.to}
        // dateRangeFrom={searchState?.timerange?.timeline?.timerange?.fromStr}
        // dateRangeTo={searchState?.timerange?.timeline?.timerange?.toStr}
        indexPatterns={[kubebeatDataView]}
        // @ts-ignore prod should prob use SiemSearchBar
        onFiltersUpdated={setFilters}
        query={searchState.query}
        // @ts-ignore
        onQuerySubmit={handleQuerySubmit}
        showFilterBar={false}
        showDatePicker={true}
        showQueryBar={true}
        showQueryInput={true}
        showSaveQuery={true}
      />
      <EuiSpacer />
      <FindingsTable data={findings} isLoading={!!isLoading} error={isError} />
    </div>
  );
};
