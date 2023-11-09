/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React, { FC, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import type { Required } from 'utility-types';
import { mlTimefilterRefresh$, useTimefilter } from '@kbn/ml-date-picker';

import {
  useEuiBreakpoint,
  useIsWithinMaxBreakpoint,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageTemplate,
  EuiPanel,
  EuiProgress,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

import { type Filter, FilterStateStore, type Query } from '@kbn/es-query';
import { generateFilters } from '@kbn/data-plugin/public';
import { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import { usePageUrlState, useUrlState } from '@kbn/ml-url-state';
import {
  DatePickerWrapper,
  FullTimeRangeSelector,
  FROZEN_TIER_PREFERENCE,
} from '@kbn/ml-date-picker';
import { useStorage } from '@kbn/ml-local-storage';

import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import { SEARCH_QUERY_LANGUAGE, type SearchQueryLanguage } from '@kbn/ml-query-utils';
import { kbnTypeToSupportedType } from '../../../common/util/field_types_utils';
import { useCurrentEuiTheme } from '../../../common/hooks/use_current_eui_theme';
import {
  DV_FROZEN_TIER_PREFERENCE,
  DV_RANDOM_SAMPLER_PREFERENCE,
  DV_RANDOM_SAMPLER_P_VALUE,
  type DVKey,
  type DVStorageMapped,
} from '../../types/storage';
import {
  DataVisualizerTable,
  ItemIdToExpandedRowMap,
} from '../../../common/components/stats_table';
import { FieldVisConfig } from '../../../common/components/stats_table/types';
import type { TotalFieldsStats } from '../../../common/components/stats_table/components/field_count_stats';
import { OverallStats } from '../../types/overall_stats';
import { IndexBasedDataVisualizerExpandedRow } from '../../../common/components/expanded_row/index_based_expanded_row';
import { DATA_VISUALIZER_INDEX_VIEWER } from '../../constants/index_data_visualizer_viewer';
import {
  DataVisualizerIndexBasedAppState,
  DataVisualizerIndexBasedPageUrlState,
} from '../../types/index_data_visualizer_state';
import { useDataVisualizerKibana } from '../../../kibana_context';
import { FieldCountPanel } from '../../../common/components/field_count_panel';
import { DocumentCountContent } from '../../../common/components/document_count_content';
import { OMIT_FIELDS } from '../../../../../common/constants';
import { SearchPanel } from '../search_panel';
import { ActionsPanel } from '../actions_panel';
import { createMergedEsQuery } from '../../utils/saved_search_utils';
import { DataVisualizerDataViewManagement } from '../data_view_management';
import { GetAdditionalLinks } from '../../../common/components/results_links';
import { useDataVisualizerGridData } from '../../hooks/use_data_visualizer_grid_data';
import { DataVisualizerGridInput } from '../../embeddables/grid_embeddable/grid_embeddable';
import {
  MIN_SAMPLER_PROBABILITY,
  RANDOM_SAMPLER_OPTION,
  RandomSamplerOption,
} from '../../constants/random_sampler';

interface DataVisualizerPageState {
  overallStats: OverallStats;
  metricConfigs: FieldVisConfig[];
  totalMetricFieldCount: number;
  populatedMetricFieldCount: number;
  metricsLoaded: boolean;
  nonMetricConfigs: FieldVisConfig[];
  nonMetricsLoaded: boolean;
  documentCountStats?: FieldVisConfig;
}

const defaultSearchQuery = {
  match_all: {},
};

export function getDefaultPageState(): DataVisualizerPageState {
  return {
    overallStats: {
      totalCount: 0,
      aggregatableExistsFields: [],
      aggregatableNotExistsFields: [],
      nonAggregatableExistsFields: [],
      nonAggregatableNotExistsFields: [],
    },
    metricConfigs: [],
    totalMetricFieldCount: 0,
    populatedMetricFieldCount: 0,
    metricsLoaded: false,
    nonMetricConfigs: [],
    nonMetricsLoaded: false,
    documentCountStats: undefined,
  };
}
export const getDefaultDataVisualizerListState = (
  overrides?: Partial<DataVisualizerIndexBasedAppState>
): Required<DataVisualizerIndexBasedAppState> => ({
  pageIndex: 0,
  pageSize: 25,
  sortField: 'fieldName',
  sortDirection: 'asc',
  visibleFieldTypes: [],
  visibleFieldNames: [],
  samplerShardSize: 5000,
  searchString: '',
  searchQuery: defaultSearchQuery,
  searchQueryLanguage: SEARCH_QUERY_LANGUAGE.KUERY,
  filters: [],
  showDistributions: true,
  showAllFields: false,
  showEmptyFields: false,
  probability: null,
  rndSamplerPref: RANDOM_SAMPLER_OPTION.ON_AUTOMATIC,
  ...overrides,
});

export interface IndexDataVisualizerESQLProps {
  getAdditionalLinks?: GetAdditionalLinks;
}

export const IndexDataVisualizerESQL: FC<IndexDataVisualizerESQLProps> = (dataVisualizerProps) => {
  const euiTheme = useCurrentEuiTheme();

  const timefilter = useTimefilter({
    timeRangeSelector: true,
    autoRefreshSelector: true,
  });

  const [frozenDataPreference, setFrozenDataPreference] = useStorage<
    DVKey,
    DVStorageMapped<typeof DV_FROZEN_TIER_PREFERENCE>
  >(
    DV_FROZEN_TIER_PREFERENCE,
    // By default we will exclude frozen data tier
    FROZEN_TIER_PREFERENCE.EXCLUDE
  );

  const restorableDefaults = useMemo(
    () => getDefaultDataVisualizerListState({}),
    // We just need to load the saved preference when the page is first loaded

    []
  );

  const { services } = useDataVisualizerKibana();
  const { uiSettings, data } = services;

  const [dataVisualizerListState, setDataVisualizerListState] =
    usePageUrlState<DataVisualizerIndexBasedPageUrlState>(
      DATA_VISUALIZER_INDEX_VIEWER,
      restorableDefaults
    );
  const [globalState, setGlobalState] = useUrlState('_g');

  const { getAdditionalLinks } = dataVisualizerProps;

  const showEmptyFields =
    dataVisualizerListState.showEmptyFields ?? restorableDefaults.showEmptyFields;
  const toggleShowEmptyFields = () => {
    setDataVisualizerListState({
      ...dataVisualizerListState,
      showEmptyFields: !dataVisualizerListState.showEmptyFields,
    });
  };

  // useEffect(() => {
  //   // Force refresh on index pattern change
  //   setLastRefresh(Date.now());
  // }, [setLastRefresh]);

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

  // const onAddFilter = useCallback(
  //   (field: DataViewField | string, values: string, operation: '+' | '-') => {
  //     const newFilters = generateFilters(
  //       data.query.filterManager,
  //       field,
  //       values,
  //       operation,
  //       currentDataView
  //     );
  //     if (newFilters) {
  //       data.query.filterManager.addFilters(newFilters);
  //     }

  //     // Merge current query with new filters
  //     const mergedQuery = {
  //       query: searchString || '',
  //       language: searchQueryLanguage,
  //     };

  //     const combinedQuery = createMergedEsQuery(
  //       {
  //         query: searchString || '',
  //         language: searchQueryLanguage,
  //       },
  //       data.query.filterManager.getFilters() ?? [],
  //       currentDataView,
  //       uiSettings
  //     );

  //     setSearchParams({
  //       searchQuery: combinedQuery,
  //       searchString: mergedQuery.query,
  //       queryLanguage: mergedQuery.language as SearchQueryLanguage,
  //       filters: data.query.filterManager.getFilters(),
  //     });
  //   },
  //   [
  //     currentDataView,
  //     data.query.filterManager,
  //     searchQueryLanguage,
  //     searchString,
  //     setSearchParams,
  //     uiSettings,
  //   ]
  // );

  // Some actions open up fly-out or popup
  // This variable is used to keep track of them and clean up when unmounting
  const actionFlyoutRef = useRef<() => void | undefined>();
  useEffect(() => {
    const ref = actionFlyoutRef;
    return () => {
      // Clean up any of the flyout/editor opened from the actions
      if (ref.current) {
        ref.current();
      }
    };
  }, []);

  // useEffect(() => {
  //   // Update data query manager if input string is updated
  //   data?.query.queryString.setQuery({
  //     query: searchString,
  //     language: searchQueryLanguage,
  //   });
  // }, [data, searchQueryLanguage, searchString]);

  // const hasValidTimeField = useMemo(
  //   () => currentDataView.timeFieldName !== undefined && currentDataView.timeFieldName !== '',
  //   [currentDataView.timeFieldName]
  // );

  const isWithinLargeBreakpoint = useIsWithinMaxBreakpoint('l');
  const dvPageHeader = css({
    [useEuiBreakpoint(['xs', 's', 'm', 'l'])]: {
      flexDirection: 'column',
      alignItems: 'flex-start',
    },
  });

  return (
    <EuiPageTemplate
      offset={0}
      restrictWidth={false}
      bottomBorder={false}
      grow={false}
      data-test-subj="dataVisualizerIndexPage"
      paddingSize="none"
    >
      <EuiPageTemplate.Section>
        <EuiPageTemplate.Header data-test-subj="dataVisualizerPageHeader" css={dvPageHeader}>
          <EuiFlexGroup
            data-test-subj="dataViewTitleHeader"
            direction="row"
            alignItems="center"
            css={{ padding: `${euiTheme.euiSizeS} 0`, marginRight: `${euiTheme.euiSize}` }}
          >
            {/* <EuiTitle size={'s'}>
              <h2>{currentDataView.getName()}</h2>
            </EuiTitle>
            <DataVisualizerDataViewManagement
              currentDataView={currentDataView}
              useNewFieldsApi={true}
            /> */}
          </EuiFlexGroup>

          {isWithinLargeBreakpoint ? <EuiSpacer size="m" /> : null}
          <EuiFlexGroup
            alignItems="center"
            justifyContent="flexEnd"
            gutterSize="s"
            data-test-subj="dataVisualizerTimeRangeSelectorSection"
          >
            {/* {hasValidTimeField ? (
              <EuiFlexItem grow={false}>
                <FullTimeRangeSelector
                  frozenDataPreference={frozenDataPreference}
                  setFrozenDataPreference={setFrozenDataPreference}
                  dataView={currentDataView}
                  query={undefined}
                  disabled={false}
                  timefilter={timefilter}
                />
              </EuiFlexItem>
            ) : null} */}
            <EuiFlexItem grow={false}>
              <DatePickerWrapper isAutoRefreshOnly={false} showRefresh={true} width="full" />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPageTemplate.Header>
        <EuiSpacer size="m" />

        <EuiFlexGroup gutterSize="m" direction={isWithinLargeBreakpoint ? 'column' : 'row'}>
          <EuiFlexItem>
            <EuiPanel hasShadow={false} hasBorder>
              {/* <SearchPanel
                dataView={currentDataView}
                searchString={searchString}
                searchQuery={searchQuery}
                searchQueryLanguage={searchQueryLanguage}
                setSearchParams={setSearchParams}
                overallStats={overallStats}
                indexedFieldTypes={fieldTypes}
                setVisibleFieldTypes={setVisibleFieldTypes}
                visibleFieldTypes={visibleFieldTypes}
                visibleFieldNames={visibleFieldNames}
                setVisibleFieldNames={setVisibleFieldNames}
                showEmptyFields={showEmptyFields}
                onAddFilter={onAddFilter}
              /> */}

              {/* {overallStats?.totalCount !== undefined && (
                <>
                  <EuiSpacer size="m" />
                  <EuiFlexGroup gutterSize="s" direction="column">
                    <DocumentCountContent
                      documentCountStats={documentCountStats}
                      totalCount={overallStats.totalCount}
                      setSamplingProbability={setSamplingProbability}
                      samplingProbability={
                        dataVisualizerListState.probability === null
                          ? documentCountStats?.probability
                          : dataVisualizerListState.probability
                      }
                      loading={overallStatsProgress.loaded < 100}
                      randomSamplerPreference={savedRandomSamplerPreference}
                      setRandomSamplerPreference={setRandomSamplerPreference}
                    />
                  </EuiFlexGroup>
                </>
              )} */}
              <EuiSpacer size="m" />
              {/* <FieldCountPanel
                showEmptyFields={showEmptyFields}
                toggleShowEmptyFields={toggleShowEmptyFields}
                fieldsCountStats={fieldsCountStats}
                metricsStats={metricsStats}
              /> */}
              <EuiSpacer size="m" />
              <EuiProgress value={50} max={100} size="xs" />
              {/* <DataVisualizerTable<FieldVisConfig>
                items={configs}
                pageState={dataVisualizerListState}
                updatePageState={setDataVisualizerListState}
                getItemIdToExpandedRowMap={getItemIdToExpandedRowMap}
                extendedColumns={extendedColumns}
                loading={progress < 100}
                overallStatsRunning={overallStatsProgress.isRunning}
                showPreviewByDefault={dataVisualizerListState.showDistributions ?? true}
                onChange={setDataVisualizerListState}
                totalCount={overallStats.totalCount}
              /> */}
            </EuiPanel>
          </EuiFlexItem>
          {/* {isWithinLargeBreakpoint ? <EuiSpacer size="m" /> : null}
          <EuiFlexItem grow={false}>
            <ActionsPanel
              dataView={currentDataView}
              searchQueryLanguage={searchQueryLanguage}
              searchString={searchString}
              getAdditionalLinks={getAdditionalLinks}
            />
          </EuiFlexItem> */}
        </EuiFlexGroup>
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};
