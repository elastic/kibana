/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState, FC } from 'react';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageBody,
  EuiPageSection,
  EuiPanel,
  EuiSpacer,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import type { WindowParameters } from '@kbn/aiops-utils';
import type { SignificantTerm } from '@kbn/ml-agg-utils';
import { Filter, FilterStateStore, Query } from '@kbn/es-query';
import { FormattedMessage } from '@kbn/i18n-react';
import { useUrlState, usePageUrlState } from '@kbn/ml-url-state';

import { useDataSource } from '../../hooks/use_data_source';
import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';
import { SearchQueryLanguage } from '../../application/utils/search_utils';
import { useData } from '../../hooks/use_data';
import {
  getDefaultAiOpsListState,
  type AiOpsPageUrlState,
} from '../../application/utils/url_state';

import { DocumentCountContent } from '../document_count_content/document_count_content';
import { SearchPanel } from '../search_panel';
import type { GroupTableItem } from '../spike_analysis_table/types';
import { useSpikeAnalysisTableRowContext } from '../spike_analysis_table/spike_analysis_table_row_provider';
import { PageHeader } from '../page_header';

import { ExplainLogRateSpikesAnalysis } from './explain_log_rate_spikes_analysis';

function getDocumentCountStatsSplitLabel(
  significantTerm?: SignificantTerm,
  group?: GroupTableItem
) {
  if (significantTerm) {
    return `${significantTerm?.fieldName}:${significantTerm?.fieldValue}`;
  } else if (group) {
    return i18n.translate('xpack.aiops.spikeAnalysisPage.documentCountStatsSplitGroupLabel', {
      defaultMessage: 'Selected group',
    });
  }
}

export const ExplainLogRateSpikesPage: FC = () => {
  const { data: dataService } = useAiopsAppContext();
  const { dataView, savedSearch } = useDataSource();

  const {
    currentSelectedSignificantTerm,
    currentSelectedGroup,
    setPinnedSignificantTerm,
    setPinnedGroup,
    setSelectedSignificantTerm,
    setSelectedGroup,
  } = useSpikeAnalysisTableRowContext();

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

  const {
    documentStats,
    timefilter,
    earliest,
    latest,
    searchQueryLanguage,
    searchString,
    searchQuery,
  } = useData(
    { selectedDataView: dataView, selectedSavedSearch },
    'explain_log_rage_spikes',
    aiopsListState,
    setGlobalState,
    currentSelectedSignificantTerm,
    currentSelectedGroup
  );

  const { sampleProbability, totalCount, documentCountStats, documentCountStatsCompare } =
    documentStats;

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
    setPinnedSignificantTerm(null);
    setPinnedGroup(null);
    setSelectedSignificantTerm(null);
    setSelectedGroup(null);
  }

  return (
    <EuiPageBody data-test-subj="aiopsExplainLogRateSpikesPage" paddingSize="none" panelled={false}>
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
          {documentCountStats !== undefined && (
            <EuiFlexItem>
              <EuiPanel paddingSize="m">
                <DocumentCountContent
                  brushSelectionUpdateHandler={setWindowParameters}
                  clearSelectionHandler={clearSelection}
                  documentCountStats={documentCountStats}
                  documentCountStatsSplit={documentCountStatsCompare}
                  documentCountStatsSplitLabel={getDocumentCountStatsSplitLabel(
                    currentSelectedSignificantTerm,
                    currentSelectedGroup
                  )}
                  totalCount={totalCount}
                  sampleProbability={sampleProbability}
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
                  sampleProbability={sampleProbability}
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
      </EuiPageSection>
    </EuiPageBody>
  );
};
