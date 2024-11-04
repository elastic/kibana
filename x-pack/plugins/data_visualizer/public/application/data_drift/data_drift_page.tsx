/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageBody,
  EuiPageSection,
  EuiPanel,
  EuiSpacer,
  EuiPageHeader,
  EuiHorizontalRule,
  EuiBadge,
} from '@elastic/eui';

import type { WindowParameters } from '@kbn/aiops-log-rate-analysis';
import { buildEsQuery, type Filter, type Query } from '@kbn/es-query';
import { useUrlState, usePageUrlState } from '@kbn/ml-url-state';
import type { DataSeriesDatum } from '@elastic/charts/dist/chart_types/xy_chart/utils/series';
import { useStorage } from '@kbn/ml-local-storage';
import type { FullTimeRangeSelectorProps } from '@kbn/ml-date-picker';
import {
  DatePickerWrapper,
  FROZEN_TIER_PREFERENCE,
  FullTimeRangeSelector,
  useTimefilter,
} from '@kbn/ml-date-picker';
import moment from 'moment';
import { css } from '@emotion/react';
import type { SearchQueryLanguage } from '@kbn/ml-query-utils';
import { i18n } from '@kbn/i18n';
import { cloneDeep } from 'lodash';
import { getEsQueryConfig } from '@kbn/data-plugin/common';
import type { SingleBrushWindowParameters } from './document_count_chart_single_brush/single_brush';
import type { InitialSettings } from './use_data_drift_result';
import { useDataDriftStateManagerContext } from './use_state_manager';
import { useData } from '../common/hooks/use_data';
import type { DVKey, DVStorageMapped } from '../index_data_visualizer/types/storage';
import { DV_FROZEN_TIER_PREFERENCE } from '../index_data_visualizer/types/storage';
import { useCurrentEuiTheme } from '../common/hooks/use_current_eui_theme';
import type { DataComparisonFullAppState } from './types';
import { getDefaultDataComparisonState } from './types';
import { useDataSource } from '../common/hooks/data_source_context';
import { useDataVisualizerKibana } from '../kibana_context';
import { DataDriftView } from './data_drift_view';
import { COMPARISON_LABEL, REFERENCE_LABEL } from './constants';
import { SearchPanelContent } from '../index_data_visualizer/components/search_panel/search_bar';
import { useSearch } from '../common/hooks/use_search';
import { DocumentCountWithBrush } from './document_count_with_brush';

const dataViewTitleHeader = css({
  minWidth: '300px',
});

interface PageHeaderProps {
  onRefresh: () => void;
  needsUpdate: boolean;
}
export const PageHeader: FC<PageHeaderProps> = ({ onRefresh, needsUpdate }) => {
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

  const updateTimeState = useCallback<NonNullable<FullTimeRangeSelectorProps['callback']>>(
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
    () => dataView && dataView.timeFieldName !== undefined && dataView.timeFieldName !== '',
    [dataView]
  );

  return (
    <EuiPageHeader
      pageTitle={
        <div data-test-subj={'mlDataDriftPageDataViewTitle'} css={dataViewTitleHeader}>
          {dataView.getName()}
        </div>
      }
      rightSideGroupProps={{
        gutterSize: 's',
        'data-test-subj': 'dataComparisonTimeRangeSelectorSection',
      }}
      rightSideItems={[
        <DatePickerWrapper
          isAutoRefreshOnly={!hasValidTimeField}
          showRefresh={!hasValidTimeField}
          width="full"
          flexGroup={!hasValidTimeField}
          onRefresh={onRefresh}
          needsUpdate={needsUpdate}
        />,
        hasValidTimeField && (
          <FullTimeRangeSelector
            frozenDataPreference={frozenDataPreference}
            setFrozenDataPreference={setFrozenDataPreference}
            dataView={dataView}
            query={undefined}
            disabled={false}
            timefilter={timefilter}
            callback={updateTimeState}
          />
        ),
      ].filter(Boolean)}
    />
  );
};

const getDataDriftDataLabel = (label: string, indexPattern?: string) => (
  <>
    <EuiBadge>{label}</EuiBadge>
    {' ' +
      i18n.translate('xpack.dataVisualizer.dataDrift.dataLabel', {
        defaultMessage: 'data',
      }) +
      (indexPattern ? `: ${indexPattern}` : '')}
  </>
);
interface Props {
  initialSettings: InitialSettings;
}

const isBarBetween = (start: number, end: number, min: number, max: number) => {
  return start >= min && end <= max;
};
export const DataDriftPage: FC<Props> = ({ initialSettings }) => {
  const {
    services: { data: dataService, uiSettings },
  } = useDataVisualizerKibana();
  const { dataView, savedSearch } = useDataSource();

  const { reference: referenceStateManager, comparison: comparisonStateManager } =
    useDataDriftStateManagerContext();

  const [dataComparisonListState, setDataComparisonListState] = usePageUrlState<{
    pageKey: 'DV_DATA_DRIFT';
    pageUrlState: DataComparisonFullAppState;
  }>('DV_DATA_DRIFT', getDefaultDataComparisonState());

  const [lastRefresh, setLastRefresh] = useState(0);

  const forceRefresh = useCallback(() => setLastRefresh(Date.now()), [setLastRefresh]);

  const randomSampler = useMemo(() => referenceStateManager.randomSampler, [referenceStateManager]);

  const randomSamplerProd = useMemo(
    () => comparisonStateManager.randomSampler,
    [comparisonStateManager]
  );

  const [globalState, setGlobalState] = useUrlState('_g');

  const [selectedSavedSearch, setSelectedSavedSearch] = useState(savedSearch);

  const [localQueryString, setLocalQueryString] = useState<Query['query'] | undefined>(
    dataComparisonListState.searchString
  );

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

      setDataComparisonListState({
        ...dataComparisonListState,
        searchQuery: searchParams.searchQuery,
        searchString: searchParams.searchString,
        searchQueryLanguage: searchParams.queryLanguage,
        filters: searchParams.filters,
      });
    },
    [selectedSavedSearch, dataComparisonListState, setDataComparisonListState]
  );

  const { searchQueryLanguage, searchString, searchQuery } = useSearch(
    { dataView, savedSearch },
    dataComparisonListState
  );

  const { documentStats, documentStatsProd, timefilter } = useData(
    initialSettings,
    dataView,
    'data_drift',
    searchString,
    searchQueryLanguage,
    randomSampler,
    randomSamplerProd,
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
    comparisonColor: euiTheme.euiColorVis1,
    overlapColor: '#490771',
  };

  const [brushRanges, setBrushRanges] = useState<WindowParameters | undefined>();

  // Ref to keep track of previous values
  const brushRangesRef = useRef<Partial<WindowParameters>>({});

  const [initialAnalysisStart, setInitialAnalysisStart] = useState<
    number | SingleBrushWindowParameters | undefined
  >();
  const [isBrushCleared, setIsBrushCleared] = useState(true);

  const referenceBrushSelectionUpdate = useCallback(
    function referenceBrushSelectionUpdate(d: SingleBrushWindowParameters, force: boolean) {
      if (!isBrushCleared || force) {
        const clone = cloneDeep(brushRangesRef.current);
        clone.baselineMin = d.min;
        clone.baselineMax = d.max;
        brushRangesRef.current = clone;
        setBrushRanges(clone as WindowParameters);
      }
      if (force) {
        setIsBrushCleared(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [brushRanges, isBrushCleared]
  );

  const comparisonBrushSelectionUpdate = useCallback(
    function comparisonBrushSelectionUpdate(d: SingleBrushWindowParameters, force: boolean) {
      if (!isBrushCleared || force) {
        const clone = cloneDeep(brushRangesRef.current);
        clone.deviationMin = d.min;
        clone.deviationMax = d.max;

        brushRangesRef.current = clone;

        setBrushRanges(clone as WindowParameters);
      }
      if (force) {
        setIsBrushCleared(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [brushRanges, isBrushCleared]
  );

  function clearSelection() {
    setBrushRanges(undefined);
    setIsBrushCleared(true);
    setInitialAnalysisStart(undefined);
  }

  const barStyleAccessor = useCallback(
    (datum: DataSeriesDatum) => {
      if (!brushRanges) return null;

      const start = typeof datum.x === 'string' ? parseInt(datum.x, 10) : datum.x;
      const end = start + (documentCountStats?.interval ?? 0);

      const isBetweenReference = isBarBetween(
        start,
        end,
        brushRanges.baselineMin,
        brushRanges.baselineMax
      );
      const isBetweenDeviation = isBarBetween(
        start,
        end,
        brushRanges.deviationMin,
        brushRanges.deviationMax
      );
      if (isBetweenReference && isBetweenDeviation) return colors.overlapColor;
      if (isBetweenReference) return colors.referenceColor;
      if (isBetweenDeviation) return colors.comparisonColor;

      return null;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify({ brushRanges, colors })]
  );
  const hasValidTimeField = useMemo(
    () => dataView && dataView.timeFieldName !== undefined && dataView.timeFieldName !== '',
    [dataView]
  );

  const referenceIndexPatternLabel = initialSettings?.reference
    ? getDataDriftDataLabel(REFERENCE_LABEL, initialSettings.reference)
    : getDataDriftDataLabel(REFERENCE_LABEL);
  const comparisonIndexPatternLabel = initialSettings?.comparison
    ? getDataDriftDataLabel(COMPARISON_LABEL, initialSettings?.comparison)
    : getDataDriftDataLabel(COMPARISON_LABEL);

  const onQueryChange = useCallback((query: Query['query'] | undefined) => {
    setLocalQueryString(query);
  }, []);

  const queryNeedsUpdate = useMemo(
    () => localQueryString !== dataComparisonListState.searchString,
    [dataComparisonListState.searchString, localQueryString]
  );

  const handleRefresh = useCallback(() => {
    if (queryNeedsUpdate) {
      const newQuery = buildEsQuery(
        dataView,
        {
          query: localQueryString || '',
          language: searchQueryLanguage,
        },
        dataService?.query.filterManager.getFilters() ?? [],
        uiSettings ? getEsQueryConfig(uiSettings) : undefined
      );
      setDataComparisonListState({
        ...dataComparisonListState,
        searchString: localQueryString,
        searchQuery: newQuery,
      });
    }
  }, [
    queryNeedsUpdate,
    dataView,
    localQueryString,
    searchQueryLanguage,
    dataService?.query.filterManager,
    uiSettings,
    setDataComparisonListState,
    dataComparisonListState,
  ]);

  return (
    <EuiPageBody data-test-subj="dataComparisonDataDriftPage" paddingSize="none" panelled={false}>
      <PageHeader onRefresh={handleRefresh} needsUpdate={queryNeedsUpdate} />
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
              onQueryChange={onQueryChange}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiPanel paddingSize="m">
              <DocumentCountWithBrush
                id={REFERENCE_LABEL}
                label={referenceIndexPatternLabel}
                randomSampler={randomSampler}
                reload={forceRefresh}
                brushSelectionUpdateHandler={referenceBrushSelectionUpdate}
                documentCountStats={documentCountStats}
                documentCountStatsSplit={documentCountStatsCompare}
                isBrushCleared={isBrushCleared}
                totalCount={totalCount}
                approximate={sampleProbability < 1}
                sampleProbability={sampleProbability}
                initialAnalysisStart={initialAnalysisStart}
                barStyleAccessor={barStyleAccessor}
                brush={{
                  label: REFERENCE_LABEL,
                  annotationStyle: {
                    strokeWidth: 0,
                    stroke: colors.referenceColor,
                    fill: colors.referenceColor,
                    opacity: 0.5,
                  },
                  badgeWidth: 80,
                }}
                stateManager={referenceStateManager}
              />
              <EuiHorizontalRule />
              <DocumentCountWithBrush
                id={COMPARISON_LABEL}
                label={comparisonIndexPatternLabel}
                randomSampler={randomSamplerProd}
                reload={forceRefresh}
                brushSelectionUpdateHandler={comparisonBrushSelectionUpdate}
                documentCountStats={documentStatsProd.documentCountStats}
                documentCountStatsSplit={documentStatsProd.documentCountStatsCompare}
                isBrushCleared={isBrushCleared}
                totalCount={documentStatsProd.totalCount}
                approximate={documentStatsProd.sampleProbability < 1}
                sampleProbability={documentStatsProd.sampleProbability}
                initialAnalysisStart={initialAnalysisStart}
                barStyleAccessor={barStyleAccessor}
                brush={{
                  label: COMPARISON_LABEL,
                  annotationStyle: {
                    strokeWidth: 0,
                    stroke: colors.comparisonColor,
                    fill: colors.comparisonColor,
                    opacity: 0.5,
                  },
                  badgeWidth: 90,
                }}
                stateManager={comparisonStateManager}
              />
            </EuiPanel>
          </EuiFlexItem>

          <EuiFlexItem>
            <EuiPanel paddingSize="m">
              <DataDriftView
                initialSettings={initialSettings}
                isBrushCleared={isBrushCleared}
                onReset={clearSelection}
                windowParameters={brushRanges}
                dataView={dataView}
                searchString={searchString ?? ''}
                searchQueryLanguage={searchQueryLanguage}
                lastRefresh={lastRefresh}
                onRefresh={forceRefresh}
                hasValidTimeField={hasValidTimeField}
              />
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageSection>
    </EuiPageBody>
  );
};
