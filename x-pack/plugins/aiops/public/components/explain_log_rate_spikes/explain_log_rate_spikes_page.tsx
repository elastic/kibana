/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState, FC } from 'react';
import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPageBody,
  EuiPageContentBody_Deprecated as EuiPageContentBody,
  EuiPageContentHeader_Deprecated as EuiPageContentHeader,
  EuiPageContentHeaderSection_Deprecated as EuiPageContentHeaderSection,
  EuiPanel,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { WindowParameters } from '@kbn/aiops-utils';
import type { ChangePoint } from '@kbn/ml-agg-utils';
import { Filter, FilterStateStore, Query } from '@kbn/es-query';
import { FormattedMessage } from '@kbn/i18n-react';
import { SavedSearch } from '@kbn/discover-plugin/public';

import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';
import { SearchQueryLanguage, SavedSearchSavedObject } from '../../application/utils/search_utils';
import { useUrlState, usePageUrlState, AppStateKey } from '../../hooks/use_url_state';
import { useData } from '../../hooks/use_data';
import { FullTimeRangeSelector } from '../full_time_range_selector';
import { DocumentCountContent } from '../document_count_content/document_count_content';
import { DatePickerWrapper } from '../date_picker_wrapper';
import { SearchPanel } from '../search_panel';

import { restorableDefaults } from './explain_log_rate_spikes_app_state';
import { ExplainLogRateSpikesAnalysis } from './explain_log_rate_spikes_analysis';
import type { GroupTableItem } from '../spike_analysis_table/spike_analysis_table_groups';
import { useSpikeAnalysisTableRowContext } from '../spike_analysis_table/spike_analysis_table_row_provider';

// TODO port to `@emotion/react` once `useEuiBreakpoint` is available https://github.com/elastic/eui/pull/6057
import './explain_log_rate_spikes_page.scss';

function getDocumentCountStatsSplitLabel(changePoint?: ChangePoint, group?: GroupTableItem) {
  if (changePoint) {
    return `${changePoint?.fieldName}:${changePoint?.fieldValue}`;
  } else if (group) {
    return i18n.translate('xpack.aiops.spikeAnalysisPage.documentCountStatsSplitGroupLabel', {
      defaultMessage: 'Selected group',
    });
  }
}

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
  const { data: dataService } = useAiopsAppContext();

  const {
    currentSelectedChangePoint,
    currentSelectedGroup,
    setPinnedChangePoint,
    setPinnedGroup,
    setSelectedChangePoint,
    setSelectedGroup,
  } = useSpikeAnalysisTableRowContext();

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
      // When the user loads a saved search and then clears or modifies the query
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

  const {
    documentStats,
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
    currentSelectedChangePoint,
    currentSelectedGroup
  );

  const { totalCount, documentCountStats, documentCountStatsCompare } = documentStats;

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

  function clearSelection() {
    setWindowParameters(undefined);
    setPinnedChangePoint(null);
    setPinnedGroup(null);
    setSelectedChangePoint(null);
    setSelectedGroup(null);
  }

  return (
    <EuiPageBody data-test-subj="aiopsExplainLogRateSpikesPage" paddingSize="none" panelled={false}>
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
          {documentCountStats !== undefined && (
            <EuiFlexItem>
              <EuiPanel paddingSize="m">
                <DocumentCountContent
                  brushSelectionUpdateHandler={setWindowParameters}
                  clearSelectionHandler={clearSelection}
                  documentCountStats={documentCountStats}
                  documentCountStatsSplit={documentCountStatsCompare}
                  documentCountStatsSplitLabel={getDocumentCountStatsSplitLabel(
                    currentSelectedChangePoint,
                    currentSelectedGroup
                  )}
                  totalCount={totalCount}
                  windowParameters={windowParameters}
                />
              </EuiPanel>
            </EuiFlexItem>
          )}
          <EuiFlexItem>
            <EuiPanel paddingSize="m">
              {earliest !== undefined && latest !== undefined && windowParameters !== undefined && (
                <ExplainLogRateSpikesAnalysis
                  dataView={dataView}
                  earliest={earliest}
                  latest={latest}
                  windowParameters={windowParameters}
                  searchQuery={searchQuery}
                />
              )}
              {windowParameters === undefined && (
                <EuiEmptyPrompt
                  title={
                    <h2>
                      <FormattedMessage
                        id="xpack.aiops.explainLogRateSpikesPage.emptyPromptTitle"
                        defaultMessage="Click a spike in the histogram chart to start the analysis."
                      />
                    </h2>
                  }
                  titleSize="xs"
                  body={
                    <p>
                      <FormattedMessage
                        id="xpack.aiops.explainLogRateSpikesPage.emptyPromptBody"
                        defaultMessage="The explain log rate spikes feature identifies statistically significant field/value combinations that contribute to a log rate spike."
                      />
                    </p>
                  }
                  data-test-subj="aiopsNoWindowParametersEmptyPrompt"
                />
              )}
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageContentBody>
    </EuiPageBody>
  );
};
