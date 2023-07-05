/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState, FC } from 'react';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageBody,
  EuiPageSection,
  EuiPanel,
  EuiSpacer,
} from '@elastic/eui';

import type { WindowParameters } from '@kbn/aiops-utils';
import { Filter, FilterStateStore, Query } from '@kbn/es-query';
import { useUrlState, usePageUrlState } from '@kbn/ml-url-state';

import {
  DataSeriesDatum,
  XYChartSeriesIdentifier,
} from '@elastic/charts/dist/chart_types/xy_chart/utils/series';
import { useSearch } from '../../hooks/use_search';
import { DataDriftView } from './data_drift_view';
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
import { PageHeader } from '../page_header';
import { useEuiTheme } from '../../hooks/use_eui_theme';

export const DataDriftDetectionPage: FC = () => {
  const { data: dataService } = useAiopsAppContext();
  const { dataView, savedSearch } = useDataSource();

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

  const { documentStats, timefilter } = useData(
    dataView,
    'data_drift',
    searchQuery,
    setGlobalState,
    undefined,
    undefined
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

  const [initialAnalysisStart, setInitialAnalysisStart] = useState<
    number | WindowParameters | undefined
  >();
  const [isBrushCleared, setIsBrushCleared] = useState(true);

  const euiTheme = useEuiTheme();
  const colors = {
    referenceColor: euiTheme.euiColorVis5,
    productionColor: euiTheme.euiColorVis1,
  };

  function brushSelectionUpdate(d: WindowParameters, force: boolean) {
    if (!isBrushCleared || force) {
      setWindowParameters(d);
    }
    if (force) {
      setIsBrushCleared(false);
    }
  }

  function clearSelection() {
    setWindowParameters(undefined);
    setIsBrushCleared(true);
    setInitialAnalysisStart(undefined);
  }

  return (
    <EuiPageBody data-test-subj="aiopsDataDriftDetectionPage" paddingSize="none" panelled={false}>
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
                  brushSelectionUpdateHandler={brushSelectionUpdate}
                  documentCountStats={documentCountStats}
                  documentCountStatsSplit={documentCountStatsCompare}
                  isBrushCleared={isBrushCleared}
                  totalCount={totalCount}
                  sampleProbability={sampleProbability}
                  initialAnalysisStart={initialAnalysisStart}
                  baselineLabel={'Reference'}
                  deviationLabel={'Production'}
                  // barColorOverride={barColorOverride}
                  // barHighlightColorOverride={barHighlightColorOverride}
                  barStyleAccessor={(
                    datum: DataSeriesDatum,
                    seriesIdentifier: XYChartSeriesIdentifier
                  ) => {
                    if (!windowParameters) return null;

                    const start = datum.x;
                    const end =
                      (typeof datum.x === 'string' ? parseInt(datum.x, 10) : datum.x) +
                      (documentCountStats?.interval ?? 0);

                    if (
                      start >= windowParameters.baselineMin &&
                      end <= windowParameters.baselineMax
                    ) {
                      return colors.referenceColor;
                    }
                    if (
                      start >= windowParameters.deviationMin &&
                      end <= windowParameters.deviationMax
                    ) {
                      return colors.productionColor;
                    }

                    return null;
                  }}
                  baselineAnnotationStyle={{
                    strokeWidth: 0,
                    stroke: colors.referenceColor,
                    fill: colors.referenceColor,
                    opacity: 0.5,
                  }}
                  deviationAnnotationStyle={{
                    strokeWidth: 0,
                    stroke: colors.productionColor,
                    fill: colors.productionColor,
                    opacity: 0.5,
                  }}
                />
              </EuiPanel>
            </EuiFlexItem>
          )}

          <EuiFlexItem>
            <EuiPanel paddingSize="m">
              <DataDriftView
                isBrushCleared={isBrushCleared}
                onReset={clearSelection}
                windowParameters={windowParameters}
                dataView={dataView}
                searchString={searchString ?? ''}
                searchQuery={searchQuery}
                searchQueryLanguage={searchQueryLanguage}
              />
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageSection>
    </EuiPageBody>
  );
};
