/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState, FC } from 'react';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { EuiFlexGroup, EuiFlexItem, EuiPageBody, EuiPageSection, EuiSpacer } from '@elastic/eui';

import { Filter, FilterStateStore, Query } from '@kbn/es-query';
import { useUrlState, usePageUrlState } from '@kbn/ml-url-state';

import type { SearchQueryLanguage } from '@kbn/ml-query-utils';
import { useDataSource } from '../../hooks/use_data_source';
import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';
import { useData } from '../../hooks/use_data';
import { useSearch } from '../../hooks/use_search';
import {
  getDefaultAiOpsListState,
  type AiOpsPageUrlState,
} from '../../application/utils/url_state';

import { SearchPanel } from '../search_panel';
import { useLogRateAnalysisResultsTableRowContext } from '../log_rate_analysis_results_table/log_rate_analysis_results_table_row_provider';
import { PageHeader } from '../page_header';

import { LogRateAnalysisContent } from './log_rate_analysis_content/log_rate_analysis_content';
interface Props {
  stickyHistogram?: boolean;
}

export const LogRateAnalysisPage: FC<Props> = ({ stickyHistogram }) => {
  const { data: dataService } = useAiopsAppContext();
  const { dataView, savedSearch } = useDataSource();

  const { currentSelectedSignificantTerm, currentSelectedGroup } =
    useLogRateAnalysisResultsTableRowContext();

  const [aiopsListState, setAiopsListState] = usePageUrlState<AiOpsPageUrlState>(
    'AIOPS_INDEX_VIEWER',
    getDefaultAiOpsListState()
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

      setAiopsListState({
        ...aiopsListState,
        searchQuery: searchParams.searchQuery,
        searchString: searchParams.searchString,
        searchQueryLanguage: searchParams.queryLanguage,
        filters: searchParams.filters,
      });
    },
    [selectedSavedSearch, aiopsListState, setAiopsListState]
  );

  const { searchQueryLanguage, searchString, searchQuery } = useSearch(
    { dataView, savedSearch },
    aiopsListState
  );

  const { timefilter } = useData(
    dataView,
    'log_rate_analysis',
    searchQuery,
    setGlobalState,
    currentSelectedSignificantTerm,
    currentSelectedGroup
  );

  useEffect(
    // TODO: Consolidate this hook/function with with Data visualizer's
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
      timefilter.setTime({
        from: globalState.time.from,
        to: globalState.time.to,
      });
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

  return (
    <EuiPageBody data-test-subj="aiopsLogRateAnalysisPage" paddingSize="none" panelled={false}>
      <PageHeader />
      <EuiSpacer size="m" />
      <EuiPageSection paddingSize="none">
        <EuiFlexGroup gutterSize="m" direction="column">
          <EuiFlexItem>
            <SearchPanel
              dataView={dataView}
              searchString={searchString ?? ''}
              searchQuery={searchQuery}
              searchQueryLanguage={searchQueryLanguage}
              setSearchParams={setSearchParams}
            />
          </EuiFlexItem>
          <LogRateAnalysisContent
            dataView={dataView}
            setGlobalState={setGlobalState}
            esSearchQuery={searchQuery}
            stickyHistogram={stickyHistogram}
          />
        </EuiFlexGroup>
      </EuiPageSection>
    </EuiPageBody>
  );
};
