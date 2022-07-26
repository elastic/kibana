/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState, FC } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPageBody,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

import type { DataView } from '@kbn/data-views-plugin/public';
import type { WindowParameters } from '@kbn/aiops-utils';
import type { ChangePoint } from '@kbn/ml-agg-utils';
import { Filter, Query } from '@kbn/es-query';
import { SavedSearch } from '@kbn/discover-plugin/public';

import { useAiOpsKibana } from '../../kibana_context';
import { SearchQueryLanguage, SavedSearchSavedObject } from '../../application/utils/search_utils';
import { useUrlState, usePageUrlState, AppStateKey } from '../../hooks/url_state';
import { useData } from '../../hooks/use_data';
import { FullTimeRangeSelector } from '../full_time_range_selector';
import { DocumentCountContent } from '../document_count_content/document_count_content';
import { DatePickerWrapper } from '../date_picker_wrapper';
import { SearchPanel } from '../search_panel';

import { restorableDefaults } from './explain_log_rate_spikes_app_state';
import { ExplainLogRateSpikesAnalysis } from './explain_log_rate_spikes_analysis';

// TODO port to `@emotion/react` once `useEuiBreakpoint` is available https://github.com/elastic/eui/pull/6057
import './explain_log_rate_spikes_page.scss';

/**
 * ExplainLogRateSpikes props require a data view.
 */
interface ExplainLogRateSpikesPageProps {
  /** The data view to analyze. */
  dataView: DataView;
  /** The saved search to analyze. */
  savedSearch: SavedSearch | SavedSearchSavedObject | null;
}

export const ExplainLogRateSpikesPage: FC<ExplainLogRateSpikesPageProps> = ({
  dataView,
  savedSearch,
}) => {
  const { services } = useAiOpsKibana();
  const { data: dataService } = services;

  const [aiopsListState, setAiopsListState] = usePageUrlState(AppStateKey, restorableDefaults);
  const [globalState, setGlobalState] = useUrlState('_g');

  const [currentSavedSearch, setCurrentSavedSearch] = useState(savedSearch);

  useEffect(() => {
    if (savedSearch) {
      setCurrentSavedSearch(savedSearch);
    }
  }, [savedSearch]);

  const setSearchParams = useCallback(
    (searchParams: {
      searchQuery: Query['query'];
      searchString: Query['query'];
      queryLanguage: SearchQueryLanguage;
      filters: Filter[];
    }) => {
      // When the user loads saved search and then clear or modify the query
      // we should remove the saved search and replace it with the index pattern id
      if (currentSavedSearch !== null) {
        setCurrentSavedSearch(null);
      }

      setAiopsListState({
        ...aiopsListState,
        searchQuery: searchParams.searchQuery,
        searchString: searchParams.searchString,
        searchQueryLanguage: searchParams.queryLanguage,
        filters: searchParams.filters,
      });
    },
    [currentSavedSearch, aiopsListState, setAiopsListState]
  );

  const [pinnedChangePoint, setPinnedChangePoint] = useState<ChangePoint | null>(null);
  const [selectedChangePoint, setSelectedChangePoint] = useState<ChangePoint | null>(null);

  // If a row is pinned, still overrule with a potentially hovered row.
  const currentSelectedChangePoint = useMemo(() => {
    if (selectedChangePoint) {
      return selectedChangePoint;
    } else if (pinnedChangePoint) {
      return pinnedChangePoint;
    }
  }, [pinnedChangePoint, selectedChangePoint]);

  const {
    overallDocStats,
    selectedDocStats,
    timefilter,
    earliest,
    latest,
    searchQueryLanguage,
    searchString,
    searchQuery,
  } = useData(
    { currentDataView: dataView, currentSavedSearch },
    aiopsListState,
    setGlobalState,
    currentSelectedChangePoint
  );

  const totalCount = currentSelectedChangePoint
    ? overallDocStats.totalCount + selectedDocStats.totalCount
    : overallDocStats.totalCount;

  useEffect(() => {
    return () => {
      // When navigating away from the index pattern
      // Reset all previously set filters
      // to make sure new page doesn't have unrelated filters
      dataService.query.filterManager.removeAll();
    };
  }, [dataView.id, dataService.query.filterManager]);

  const [windowParameters, setWindowParameters] = useState<WindowParameters | undefined>();

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
    <EuiPageBody data-test-subj="aiopsIndexPage" paddingSize="none" panelled={false}>
      <EuiFlexGroup gutterSize="none">
        <EuiFlexItem>
          <EuiPageContentHeader className="aiopsPageHeader">
            <EuiPageContentHeaderSection>
              <div className="dataViewTitleHeader">
                <EuiTitle size={'s'}>
                  <h2>{dataView.getName()}</h2>
                </EuiTitle>
              </div>
            </EuiPageContentHeaderSection>

            <EuiFlexGroup
              alignItems="center"
              justifyContent="flexEnd"
              gutterSize="s"
              data-test-subj="aiopsTimeRangeSelectorSection"
            >
              {dataView.timeFieldName !== undefined && (
                <EuiFlexItem grow={false}>
                  <FullTimeRangeSelector
                    dataView={dataView}
                    query={undefined}
                    disabled={false}
                    timefilter={timefilter}
                  />
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false}>
                <DatePickerWrapper />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPageContentHeader>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule />
      <EuiPageContentBody>
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
          {overallDocStats?.totalCount !== undefined && (
            <EuiFlexItem>
              <DocumentCountContent
                brushSelectionUpdateHandler={setWindowParameters}
                documentCountStats={overallDocStats.documentCountStats}
                documentCountStatsSplit={
                  currentSelectedChangePoint ? selectedDocStats.documentCountStats : undefined
                }
                totalCount={totalCount}
                changePoint={currentSelectedChangePoint}
              />
            </EuiFlexItem>
          )}
          <EuiSpacer size="m" />
          {earliest !== undefined && latest !== undefined && windowParameters !== undefined && (
            <EuiFlexItem>
              <ExplainLogRateSpikesAnalysis
                dataView={dataView}
                earliest={earliest}
                latest={latest}
                windowParameters={windowParameters}
                searchQuery={searchQuery}
                onPinnedChangePoint={setPinnedChangePoint}
                onSelectedChangePoint={setSelectedChangePoint}
                selectedChangePoint={currentSelectedChangePoint}
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiPageContentBody>
    </EuiPageBody>
  );
};
