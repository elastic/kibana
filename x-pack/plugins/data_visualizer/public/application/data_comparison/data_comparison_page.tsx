/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState, FC, useMemo } from 'react';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageBody,
  EuiPageSection,
  EuiPanel,
  EuiSpacer,
  EuiPageHeader,
  EuiCallOut,
} from '@elastic/eui';

import type { WindowParameters } from '@kbn/aiops-utils';
import type { Filter, Query } from '@kbn/es-query';
import { useUrlState, usePageUrlState } from '@kbn/ml-url-state';
import type { DataSeriesDatum } from '@elastic/charts/dist/chart_types/xy_chart/utils/series';
import { useStorage } from '@kbn/ml-local-storage';
import {
  DatePickerWrapper,
  FROZEN_TIER_PREFERENCE,
  FullTimeRangeSelector,
  FullTimeRangeSelectorProps,
  useTimefilter,
} from '@kbn/ml-date-picker';
import moment from 'moment';
import { css } from '@emotion/react';
import type { SearchQueryLanguage } from '@kbn/ml-query-utils';
import { i18n } from '@kbn/i18n';
import { RANDOM_SAMPLER_OPTION, RandomSampler } from '@kbn/ml-random-sampler-utils';
import { MIN_SAMPLER_PROBABILITY } from '../index_data_visualizer/constants/random_sampler';
import { useData } from '../common/hooks/use_data';
import {
  DV_FROZEN_TIER_PREFERENCE,
  DV_RANDOM_SAMPLER_P_VALUE,
  DV_RANDOM_SAMPLER_PREFERENCE,
  DVKey,
  DVStorageMapped,
} from '../index_data_visualizer/types/storage';
import { useCurrentEuiTheme } from '../common/hooks/use_current_eui_theme';
import { DataComparisonFullAppState, getDefaultDataComparisonState } from './types';
import { useDataSource } from '../common/hooks/data_source_context';
import { useDataVisualizerKibana } from '../kibana_context';
import { DataComparisonView } from './data_comparison_view';
import { COMPARISON_LABEL, REFERENCE_LABEL } from './constants';
import { SearchPanelContent } from '../index_data_visualizer/components/search_panel/search_bar';
import { useSearch } from '../common/hooks/use_search';
import { DocumentCountWithDualBrush } from './document_count_with_dual_brush';

const dataViewTitleHeader = css({
  minWidth: '300px',
});

export const PageHeader: FC = () => {
  const [, setGlobalState] = useUrlState('_g');
  const { dataView } = useDataSource();

  const [frozenDataPreference, setFrozenDataPreference] = useStorage<
    DVKey,
    DVStorageMapped<typeof DV_FROZEN_TIER_PREFERENCE>
  >(
    DV_FROZEN_TIER_PREFERENCE,
    // By default we will exclude frozen data tier
    FROZEN_TIER_PREFERENCE.EXCLUDE
  );

  const timefilter = useTimefilter({
    timeRangeSelector: dataView.timeFieldName !== undefined,
    autoRefreshSelector: true,
  });

  const updateTimeState: FullTimeRangeSelectorProps['callback'] = useCallback(
    (update) => {
      setGlobalState({
        time: {
          from: moment(update.start.epoch).toISOString(),
          to: moment(update.end.epoch).toISOString(),
        },
      });
    },
    [setGlobalState]
  );

  const hasValidTimeField = useMemo(
    () => dataView.timeFieldName !== undefined && dataView.timeFieldName !== '',
    [dataView.timeFieldName]
  );

  return (
    <EuiPageHeader
      pageTitle={<div css={dataViewTitleHeader}>{dataView.getName()}</div>}
      rightSideItems={[
        <EuiFlexGroup gutterSize="s" data-test-subj="dataComparisonTimeRangeSelectorSection">
          {hasValidTimeField ? (
            <EuiFlexItem grow={false}>
              <FullTimeRangeSelector
                frozenDataPreference={frozenDataPreference}
                setFrozenDataPreference={setFrozenDataPreference}
                dataView={dataView}
                query={undefined}
                disabled={false}
                timefilter={timefilter}
                callback={updateTimeState}
              />
            </EuiFlexItem>
          ) : null}
          <DatePickerWrapper
            isAutoRefreshOnly={!hasValidTimeField}
            showRefresh={!hasValidTimeField}
            width="full"
            flexGroup={false}
          />
        </EuiFlexGroup>,
      ]}
    />
  );
};

export const DataComparisonPage: FC = () => {
  const {
    services: { data: dataService },
  } = useDataVisualizerKibana();
  const { dataView, savedSearch } = useDataSource();

  const [dataComparisonListState, setAiopsListState] = usePageUrlState<{
    pageKey: 'DV_DATA_COMP';
    pageUrlState: DataComparisonFullAppState;
  }>('DV_DATA_COMP', getDefaultDataComparisonState());

  const [randomSamplerMode, setRandomSamplerMode] = useStorage<
    DVKey,
    DVStorageMapped<typeof DV_RANDOM_SAMPLER_PREFERENCE>
  >(DV_RANDOM_SAMPLER_PREFERENCE, RANDOM_SAMPLER_OPTION.ON_AUTOMATIC);

  const [randomSamplerProbability, setRandomSamplerProbability] = useStorage<
    DVKey,
    DVStorageMapped<typeof DV_RANDOM_SAMPLER_P_VALUE>
  >(DV_RANDOM_SAMPLER_P_VALUE, MIN_SAMPLER_PROBABILITY);
  const [lastRefresh, setLastRefresh] = useState(0);

  const forceRefresh = useCallback(() => setLastRefresh(Date.now()), [setLastRefresh]);

  const randomSampler = useMemo(
    () =>
      new RandomSampler(
        randomSamplerMode,
        setRandomSamplerMode,
        randomSamplerProbability,
        setRandomSamplerProbability
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
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
        ...dataComparisonListState,
        searchQuery: searchParams.searchQuery,
        searchString: searchParams.searchString,
        searchQueryLanguage: searchParams.queryLanguage,
        filters: searchParams.filters,
      });
    },
    [selectedSavedSearch, dataComparisonListState, setAiopsListState]
  );

  const { searchQueryLanguage, searchString, searchQuery } = useSearch(
    { dataView, savedSearch },
    dataComparisonListState
  );

  const { documentStats, timefilter } = useData(
    dataView,
    'data_drift',
    searchQuery,
    randomSampler,
    setGlobalState,
    undefined
  );

  const { sampleProbability, totalCount, documentCountStats, documentCountStatsCompare } =
    documentStats;

  useEffect(() => {
    randomSampler.setDocCount(totalCount);
  }, [totalCount, randomSampler]);

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

  const euiTheme = useCurrentEuiTheme();
  const colors = {
    referenceColor: euiTheme.euiColorVis2,
    productionColor: euiTheme.euiColorVis1,
  };

  const [windowParameters, setWindowParameters] = useState<WindowParameters | undefined>();
  const [initialAnalysisStart, setInitialAnalysisStart] = useState<
    number | WindowParameters | undefined
  >();
  const [isBrushCleared, setIsBrushCleared] = useState(true);

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

  const barStyleAccessor = useCallback(
    (datum: DataSeriesDatum) => {
      if (!windowParameters) return null;

      const start = datum.x;
      const end =
        (typeof datum.x === 'string' ? parseInt(datum.x, 10) : datum.x) +
        (documentCountStats?.interval ?? 0);

      if (start >= windowParameters.baselineMin && end <= windowParameters.baselineMax) {
        return colors.referenceColor;
      }
      if (start >= windowParameters.deviationMin && end <= windowParameters.deviationMax) {
        return colors.productionColor;
      }

      return null;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify({ windowParameters, colors })]
  );

  return (
    <EuiPageBody
      data-test-subj="dataComparisonDataComparisonPage"
      paddingSize="none"
      panelled={false}
    >
      <PageHeader />
      <EuiSpacer size="m" />
      <EuiPageSection paddingSize="none">
        <EuiFlexGroup gutterSize="m" direction="column">
          <EuiFlexItem>
            <SearchPanelContent
              dataView={dataView}
              searchString={searchString}
              searchQuery={searchQuery}
              searchQueryLanguage={searchQueryLanguage}
              setSearchParams={setSearchParams}
            />
          </EuiFlexItem>
          {documentCountStats !== undefined && (
            <EuiFlexItem>
              <EuiPanel paddingSize="m">
                <DocumentCountWithDualBrush
                  randomSampler={randomSampler}
                  reload={forceRefresh}
                  brushSelectionUpdateHandler={brushSelectionUpdate}
                  documentCountStats={documentCountStats}
                  documentCountStatsSplit={documentCountStatsCompare}
                  isBrushCleared={isBrushCleared}
                  totalCount={totalCount}
                  approximate={sampleProbability < 1}
                  sampleProbability={sampleProbability}
                  initialAnalysisStart={initialAnalysisStart}
                  barStyleAccessor={barStyleAccessor}
                  baselineBrush={{
                    label: REFERENCE_LABEL,
                    annotationStyle: {
                      strokeWidth: 0,
                      stroke: colors.referenceColor,
                      fill: colors.referenceColor,
                      opacity: 0.5,
                    },
                    badgeWidth: 80,
                  }}
                  deviationBrush={{
                    label: COMPARISON_LABEL,
                    annotationStyle: {
                      strokeWidth: 0,
                      stroke: colors.productionColor,
                      fill: colors.productionColor,
                      opacity: 0.5,
                    },
                    badgeWidth: 90,
                  }}
                />
              </EuiPanel>
            </EuiFlexItem>
          )}

          <EuiFlexItem>
            <EuiPanel paddingSize="m">
              {!dataView?.isTimeBased() ? (
                <EuiCallOut
                  title={i18n.translate(
                    'xpack.dataVisualizer.dataViewNotBasedOnTimeSeriesWarning.title',
                    {
                      defaultMessage:
                        'The data view "{dataViewTitle}" is not based on a time series.',
                      values: { dataViewTitle: dataView.getName() },
                    }
                  )}
                  color="danger"
                  iconType="warning"
                >
                  <p>
                    {i18n.translate(
                      'xpack.dataVisualizer.dataComparisonTimeSeriesWarning.description',
                      {
                        defaultMessage: 'Data comparison only runs over time-based indices.',
                      }
                    )}
                  </p>
                </EuiCallOut>
              ) : (
                <DataComparisonView
                  isBrushCleared={isBrushCleared}
                  onReset={clearSelection}
                  windowParameters={windowParameters}
                  dataView={dataView}
                  searchString={searchString ?? ''}
                  searchQuery={searchQuery}
                  searchQueryLanguage={searchQueryLanguage}
                  lastRefresh={lastRefresh}
                  randomSampler={randomSampler}
                  forceRefresh={forceRefresh}
                />
              )}
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageSection>
    </EuiPageBody>
  );
};
