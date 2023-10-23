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
  EuiHorizontalRule,
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
import type { InitialSettings } from './use_data_drift_result';
import { useDataDriftStateManagerContext } from './use_state_manager';
import { useData } from '../common/hooks/use_data';
import {
  DV_FROZEN_TIER_PREFERENCE,
  DVKey,
  DVStorageMapped,
} from '../index_data_visualizer/types/storage';
import { useCurrentEuiTheme } from '../common/hooks/use_current_eui_theme';
import { DataComparisonFullAppState, getDefaultDataComparisonState } from './types';
import { useDataSource } from '../common/hooks/data_source_context';
import { useDataVisualizerKibana } from '../kibana_context';
import { DataDriftView } from './data_drift_view';
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
      pageTitle={
        <div data-test-subj={'mlDataDriftPageDataViewTitle'} css={dataViewTitleHeader}>
          {dataView.getName()}
        </div>
      }
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

const getDataDriftDataLabel = (label: string, indexPattern?: string) =>
  i18n.translate('xpack.dataVisualizer.dataDrift.dataLabel', {
    defaultMessage: '{label} data',
    values: { label },
  }) + (indexPattern ? `: ${indexPattern}` : '');

interface Props {
  initialSettings: InitialSettings;
}

export const DataDriftPage: FC<Props> = ({ initialSettings }) => {
  const {
    services: { data: dataService },
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
        return colors.comparisonColor;
      }

      return null;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify({ windowParameters, colors })]
  );

  const referenceIndexPatternLabel = initialSettings?.reference
    ? getDataDriftDataLabel(REFERENCE_LABEL, initialSettings.reference)
    : getDataDriftDataLabel(REFERENCE_LABEL);
  const comparisonIndexPatternLabel = initialSettings?.comparison
    ? getDataDriftDataLabel(COMPARISON_LABEL, initialSettings?.comparison)
    : getDataDriftDataLabel(COMPARISON_LABEL);

  return (
    <EuiPageBody data-test-subj="dataComparisonDataDriftPage" paddingSize="none" panelled={false}>
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
          <EuiFlexItem>
            <EuiPanel paddingSize="m">
              <DocumentCountWithDualBrush
                id={REFERENCE_LABEL}
                label={referenceIndexPatternLabel}
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
                    stroke: colors.comparisonColor,
                    fill: colors.comparisonColor,
                    opacity: 0.5,
                  },
                  badgeWidth: 90,
                }}
                stateManager={referenceStateManager}
              />
              <EuiHorizontalRule />
              <DocumentCountWithDualBrush
                id={COMPARISON_LABEL}
                label={comparisonIndexPatternLabel}
                randomSampler={randomSamplerProd}
                reload={forceRefresh}
                documentCountStats={documentStatsProd.documentCountStats}
                documentCountStatsSplit={documentStatsProd.documentCountStatsCompare}
                isBrushCleared={isBrushCleared}
                totalCount={documentStatsProd.totalCount}
                approximate={documentStatsProd.sampleProbability < 1}
                sampleProbability={documentStatsProd.sampleProbability}
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
                windowParameters={windowParameters}
                dataView={dataView}
                searchString={searchString ?? ''}
                searchQueryLanguage={searchQueryLanguage}
                lastRefresh={lastRefresh}
                onRefresh={forceRefresh}
              />
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageSection>
    </EuiPageBody>
  );
};
