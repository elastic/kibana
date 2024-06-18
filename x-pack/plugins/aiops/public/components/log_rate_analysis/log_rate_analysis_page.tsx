/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useEffect, useState } from 'react';
import { isEqual } from 'lodash';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { EuiFlexGroup, EuiFlexItem, EuiPageBody, EuiPageSection, EuiSpacer } from '@elastic/eui';

import type { Filter, Query } from '@kbn/es-query';
import { FilterStateStore } from '@kbn/es-query';
import { useUrlState, usePageUrlState } from '@kbn/ml-url-state';
import type { SearchQueryLanguage } from '@kbn/ml-query-utils';
import type { WindowParameters } from '@kbn/aiops-log-rate-analysis';
import { AIOPS_TELEMETRY_ID } from '@kbn/aiops-common/constants';
import {
  useAppDispatch,
  useCurrentSelectedSignificantItem,
  useCurrentSelectedGroup,
  setInitialAnalysisStart,
  setDocumentCountChartData,
} from '@kbn/aiops-log-rate-analysis/state';

import { useDataSource } from '../../hooks/use_data_source';
import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';
import { useData } from '../../hooks/use_data';
import { useSearch } from '../../hooks/use_search';
import {
  getDefaultLogRateAnalysisAppState,
  appStateToWindowParameters,
  windowParametersToAppState,
  type LogRateAnalysisPageUrlState,
} from '../../application/url_state/log_rate_analysis';

import { SearchPanel } from '../search_panel';
import { PageHeader } from '../page_header';

import { LogRateAnalysisContent } from './log_rate_analysis_content/log_rate_analysis_content';

export const LogRateAnalysisPage: FC = () => {
  const { data: dataService } = useAiopsAppContext();
  const { dataView, savedSearch } = useDataSource();

  const currentSelectedGroup = useCurrentSelectedGroup();
  const currentSelectedSignificantItem = useCurrentSelectedSignificantItem();
  const dispatch = useAppDispatch();

  const [stateFromUrl, setUrlState] = usePageUrlState<LogRateAnalysisPageUrlState>(
    'logRateAnalysis',
    getDefaultLogRateAnalysisAppState()
  );
  const [globalState, setGlobalState] = useUrlState('_g');

  const [selectedSavedSearch, setSelectedSavedSearch] = useState(savedSearch);

  useEffect(() => {
    if (savedSearch) {
      setSelectedSavedSearch(savedSearch);
    }
  }, [savedSearch]);

  const setSearchParams = useCallback(
    (searchParams: {
      searchQuery: estypes.QueryDslQueryContainer;
      searchString: Query['query'];
      queryLanguage: SearchQueryLanguage;
      filters: Filter[];
    }) => {
      // When the user loads a saved search and then clears or modifies the query
      // we should remove the saved search and replace it with the index pattern id
      if (selectedSavedSearch !== null) {
        setSelectedSavedSearch(null);
      }

      setUrlState({
        ...stateFromUrl,
        searchQuery: searchParams.searchQuery,
        searchString: searchParams.searchString,
        searchQueryLanguage: searchParams.queryLanguage,
        filters: searchParams.filters,
      });
    },
    [selectedSavedSearch, stateFromUrl, setUrlState]
  );

  const { searchQueryLanguage, searchString, searchQuery } = useSearch(
    { dataView, savedSearch },
    stateFromUrl
  );

  const { documentStats, timefilter, earliest, latest, intervalMs } = useData(
    dataView,
    'log_rate_analysis',
    searchQuery,
    setGlobalState,
    currentSelectedSignificantItem,
    currentSelectedGroup
  );

  // TODO Since `useData` isn't just used within Log Rate Analysis, this is a bit of
  // a workaround to pass the result on to the redux store. At least this ensures
  // we now use `useData` only once across Log Rate Analysis! Originally `useData`
  // was quite general, but over time it got quite some specific features used
  // across Log Rate Analysis and Pattern Analysis. We discussed that we should
  // split this up into more specific hooks.
  useEffect(() => {
    dispatch(
      setDocumentCountChartData({
        earliest,
        latest,
        intervalMs,
        documentStats,
      })
    );
  }, [documentStats, dispatch, earliest, intervalMs, latest]);

  useEffect(
    // TODO: Consolidate this hook/function with the one in `x-pack/plugins/data_visualizer/public/application/index_data_visualizer/components/index_data_visualizer_view/index_data_visualizer_view.tsx`
    function clearFiltersOnLeave() {
      return () => {
        // We want to clear all filters that have not been pinned globally
        // when navigating to other pages
        dataService.query.filterManager
          .getFilters()
          .filter((f) => f.$state?.store === FilterStateStore.APP_STATE)
          .forEach((f) => dataService.query.filterManager.removeFilter(f));
      };
    },
    [dataService.query.filterManager]
  );

  useEffect(() => {
    if (globalState?.time !== undefined) {
      if (
        !isEqual({ from: globalState.time.from, to: globalState.time.to }, timefilter.getTime())
      ) {
        timefilter.setTime({
          from: globalState.time.from,
          to: globalState.time.to,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(globalState?.time), timefilter]);

  useEffect(() => {
    if (globalState?.refreshInterval !== undefined) {
      timefilter.setRefreshInterval(globalState.refreshInterval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(globalState?.refreshInterval), timefilter]);

  useEffect(() => {
    // Update data query manager if input string is updated
    dataService?.query.queryString.setQuery({
      query: searchString ?? '',
      language: searchQueryLanguage,
    });
  }, [dataService, searchQueryLanguage, searchString]);

  useEffect(
    () => {
      dispatch(setInitialAnalysisStart(appStateToWindowParameters(stateFromUrl.wp)));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const onWindowParametersHandler = (wp?: WindowParameters, replace = false) => {
    if (!isEqual(windowParametersToAppState(wp), stateFromUrl.wp)) {
      setUrlState(
        {
          wp: windowParametersToAppState(wp),
        },
        replace
      );
    }
  };

  return (
    <EuiPageBody data-test-subj="aiopsLogRateAnalysisPage" paddingSize="none" panelled={false}>
      <PageHeader />
      <EuiSpacer size="m" />
      <EuiPageSection paddingSize="none">
        <EuiFlexGroup gutterSize="m" direction="column">
          <EuiFlexItem>
            <SearchPanel
              searchString={searchString ?? ''}
              searchQuery={searchQuery}
              searchQueryLanguage={searchQueryLanguage}
              setSearchParams={setSearchParams}
            />
          </EuiFlexItem>
          <LogRateAnalysisContent
            embeddingOrigin={AIOPS_TELEMETRY_ID.AIOPS_DEFAULT_SOURCE}
            esSearchQuery={searchQuery}
            onWindowParametersChange={onWindowParametersHandler}
          />
        </EuiFlexGroup>
      </EuiPageSection>
    </EuiPageBody>
  );
};
