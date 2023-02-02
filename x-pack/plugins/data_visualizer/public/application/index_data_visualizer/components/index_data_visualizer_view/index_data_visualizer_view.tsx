/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React, { FC, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import type { Required } from 'utility-types';

import {
  useEuiBreakpoint,
  useIsWithinMaxBreakpoint,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageBody,
  EuiPageContentBody_Deprecated as EuiPageContentBody,
  EuiPageContentHeader_Deprecated as EuiPageContentHeader,
  EuiPageContentHeaderSection_Deprecated as EuiPageContentHeaderSection,
  EuiPanel,
  EuiProgress,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { Filter, FilterStateStore, Query } from '@kbn/es-query';
import { generateFilters } from '@kbn/data-plugin/public';
import { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import { usePageUrlState, useUrlState } from '@kbn/ml-url-state';
import {
  DatePickerWrapper,
  FullTimeRangeSelector,
  FROZEN_TIER_PREFERENCE,
} from '@kbn/ml-date-picker';
import { useStorage } from '@kbn/ml-local-storage';

import { useCurrentEuiTheme } from '../../../common/hooks/use_current_eui_theme';
import {
  DV_FROZEN_TIER_PREFERENCE,
  DV_RANDOM_SAMPLER_PREFERENCE,
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
import { SEARCH_QUERY_LANGUAGE, SearchQueryLanguage } from '../../types/combined_query';
import { SupportedFieldType, SavedSearchSavedObject } from '../../../../../common/types';
import { useDataVisualizerKibana } from '../../../kibana_context';
import { FieldCountPanel } from '../../../common/components/field_count_panel';
import { DocumentCountContent } from '../../../common/components/document_count_content';
import { OMIT_FIELDS } from '../../../../../common/constants';
import { kbnTypeToJobType } from '../../../common/util/field_types_utils';
import { SearchPanel } from '../search_panel';
import { ActionsPanel } from '../actions_panel';
import { createMergedEsQuery } from '../../utils/saved_search_utils';
import { DataVisualizerDataViewManagement } from '../data_view_management';
import { GetAdditionalLinks } from '../../../common/components/results_links';
import { useDataVisualizerGridData } from '../../hooks/use_data_visualizer_grid_data';
import { DataVisualizerGridInput } from '../../embeddables/grid_embeddable/grid_embeddable';
import { RANDOM_SAMPLER_OPTION } from '../../constants/random_sampler';

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

export interface IndexDataVisualizerViewProps {
  currentDataView: DataView;
  currentSavedSearch: SavedSearchSavedObject | null;
  currentSessionId?: string;
  getAdditionalLinks?: GetAdditionalLinks;
}

export const IndexDataVisualizerView: FC<IndexDataVisualizerViewProps> = (dataVisualizerProps) => {
  const euiTheme = useCurrentEuiTheme();

  const [savedRandomSamplerPreference, saveRandomSamplerPreference] = useStorage<
    DVKey,
    DVStorageMapped<typeof DV_RANDOM_SAMPLER_PREFERENCE>
  >(DV_RANDOM_SAMPLER_PREFERENCE, RANDOM_SAMPLER_OPTION.ON_AUTOMATIC);

  const [frozenDataPreference, setFrozenDataPreference] = useStorage<
    DVKey,
    DVStorageMapped<typeof DV_FROZEN_TIER_PREFERENCE>
  >(
    DV_FROZEN_TIER_PREFERENCE,
    // By default we will exclude frozen data tier
    FROZEN_TIER_PREFERENCE.EXCLUDE
  );

  const restorableDefaults = useMemo(
    () =>
      getDefaultDataVisualizerListState({
        rndSamplerPref: savedRandomSamplerPreference,
      }),
    // We just need to load the saved preference when the page is first loaded
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const { services } = useDataVisualizerKibana();
  const { notifications, uiSettings, data } = services;
  const { toasts } = notifications;

  const [dataVisualizerListState, setDataVisualizerListState] =
    usePageUrlState<DataVisualizerIndexBasedPageUrlState>(
      DATA_VISUALIZER_INDEX_VIEWER,
      restorableDefaults
    );
  const [globalState, setGlobalState] = useUrlState('_g');

  const [currentSavedSearch, setCurrentSavedSearch] = useState(
    dataVisualizerProps.currentSavedSearch
  );

  const { currentDataView, currentSessionId, getAdditionalLinks } = dataVisualizerProps;

  useEffect(() => {
    if (dataVisualizerProps?.currentSavedSearch !== undefined) {
      setCurrentSavedSearch(dataVisualizerProps?.currentSavedSearch);
    }
  }, [dataVisualizerProps?.currentSavedSearch]);

  useEffect(() => {
    if (!currentDataView.isTimeBased()) {
      toasts.addWarning({
        title: i18n.translate(
          'xpack.dataVisualizer.index.dataViewNotBasedOnTimeSeriesNotificationTitle',
          {
            defaultMessage: 'The data view {dataViewTitle} is not based on a time series',
            values: { dataViewTitle: currentDataView.title },
          }
        ),
        text: i18n.translate(
          'xpack.dataVisualizer.index.dataViewNotBasedOnTimeSeriesNotificationDescription',
          {
            defaultMessage: 'Anomaly detection only runs over time-based indices',
          }
        ),
      });
    }
  }, [currentDataView, toasts]);

  const dataViewFields: DataViewField[] = currentDataView.fields;

  const fieldTypes = useMemo(() => {
    // Obtain the list of non metric field types which appear in the index pattern.
    const indexedFieldTypes: SupportedFieldType[] = [];
    dataViewFields.forEach((field) => {
      if (!OMIT_FIELDS.includes(field.name) && field.scripted !== true) {
        const dataVisualizerType: SupportedFieldType | undefined = kbnTypeToJobType(field);
        if (dataVisualizerType !== undefined && !indexedFieldTypes.includes(dataVisualizerType)) {
          indexedFieldTypes.push(dataVisualizerType);
        }
      }
    });
    return indexedFieldTypes.sort();
  }, [dataViewFields]);

  const setSearchParams = useCallback(
    (searchParams: {
      searchQuery: Query['query'];
      searchString: Query['query'];
      queryLanguage: SearchQueryLanguage;
      filters: Filter[];
    }) => {
      // When the user loads saved search and then clears or modifies the query
      // we should remove the saved search and replace it with the index pattern id
      if (currentSavedSearch !== null) {
        setCurrentSavedSearch(null);
      }

      setDataVisualizerListState({
        ...dataVisualizerListState,
        searchQuery: searchParams.searchQuery,
        searchString: searchParams.searchString,
        searchQueryLanguage: searchParams.queryLanguage,
        filters: searchParams.filters,
      });
    },
    [currentSavedSearch, dataVisualizerListState, setDataVisualizerListState]
  );

  const visibleFieldTypes =
    dataVisualizerListState.visibleFieldTypes ?? restorableDefaults.visibleFieldTypes;
  const setVisibleFieldTypes = (values: string[]) => {
    setDataVisualizerListState({ ...dataVisualizerListState, visibleFieldTypes: values });
  };

  const visibleFieldNames =
    dataVisualizerListState.visibleFieldNames ?? restorableDefaults.visibleFieldNames;
  const setVisibleFieldNames = (values: string[]) => {
    setDataVisualizerListState({ ...dataVisualizerListState, visibleFieldNames: values });
  };

  const showEmptyFields =
    dataVisualizerListState.showEmptyFields ?? restorableDefaults.showEmptyFields;
  const toggleShowEmptyFields = () => {
    setDataVisualizerListState({
      ...dataVisualizerListState,
      showEmptyFields: !dataVisualizerListState.showEmptyFields,
    });
  };

  const input: DataVisualizerGridInput = useMemo(() => {
    return {
      dataView: currentDataView,
      savedSearch: currentSavedSearch,
      sessionId: currentSessionId,
      visibleFieldNames,
      allowEditDataView: true,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDataView.id, currentSavedSearch?.id, visibleFieldNames, currentSessionId]);

  const {
    configs,
    searchQueryLanguage,
    searchString,
    overallStats,
    searchQuery,
    documentCountStats,
    metricsStats,
    timefilter,
    setLastRefresh,
    progress,
    extendedColumns,
    overallStatsProgress,
  } = useDataVisualizerGridData(
    input,
    dataVisualizerListState,
    savedRandomSamplerPreference,
    setGlobalState
  );

  useEffect(
    () => {
      switch (savedRandomSamplerPreference) {
        case RANDOM_SAMPLER_OPTION.OFF:
          setSamplingProbability(1);
          return;
        case RANDOM_SAMPLER_OPTION.ON_MANUAL:
          setSamplingProbability(
            dataVisualizerListState?.probability ?? documentCountStats?.probability ?? null
          );
          return;
        case RANDOM_SAMPLER_OPTION.ON_AUTOMATIC:
        default:
          setSamplingProbability(null);
          return;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      dataVisualizerListState.probability,
      documentCountStats?.probability,
      savedRandomSamplerPreference,
    ]
  );

  const setSamplingProbability = (value: number | null) => {
    setDataVisualizerListState({ ...dataVisualizerListState, probability: value });
  };

  useEffect(
    function clearFiltersOnLeave() {
      return () => {
        // We want to clear all filters that have not been pinned globally
        // when navigating to other pages
        data.query.filterManager
          .getFilters()
          .filter((f) => f.$state?.store === FilterStateStore.APP_STATE)
          .forEach((f) => data.query.filterManager.removeFilter(f));
      };
    },
    [data.query.filterManager]
  );

  useEffect(() => {
    // Force refresh on index pattern change
    setLastRefresh(Date.now());
  }, [currentDataView.id, setLastRefresh]);

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

  const onAddFilter = useCallback(
    (field: DataViewField | string, values: string, operation: '+' | '-') => {
      const newFilters = generateFilters(
        data.query.filterManager,
        field,
        values,
        operation,
        currentDataView
      );
      if (newFilters) {
        data.query.filterManager.addFilters(newFilters);
      }

      // Merge current query with new filters
      const mergedQuery = {
        query: searchString || '',
        language: searchQueryLanguage,
      };

      const combinedQuery = createMergedEsQuery(
        {
          query: searchString || '',
          language: searchQueryLanguage,
        },
        data.query.filterManager.getFilters() ?? [],
        currentDataView,
        uiSettings
      );

      setSearchParams({
        searchQuery: combinedQuery,
        searchString: mergedQuery.query,
        queryLanguage: mergedQuery.language as SearchQueryLanguage,
        filters: data.query.filterManager.getFilters(),
      });
    },
    [
      currentDataView,
      data.query.filterManager,
      searchQueryLanguage,
      searchString,
      setSearchParams,
      uiSettings,
    ]
  );

  const fieldsCountStats: TotalFieldsStats | undefined = useMemo(() => {
    let _visibleFieldsCount = 0;
    let _totalFieldsCount = 0;
    Object.keys(overallStats).forEach((key) => {
      const fieldsGroup = overallStats[key as keyof OverallStats];
      if (Array.isArray(fieldsGroup) && fieldsGroup.length > 0) {
        _totalFieldsCount += fieldsGroup.length;
      }
    });

    if (showEmptyFields === true) {
      _visibleFieldsCount = _totalFieldsCount;
    } else {
      _visibleFieldsCount =
        overallStats.aggregatableExistsFields.length +
        overallStats.nonAggregatableExistsFields.length;
    }
    return { visibleFieldsCount: _visibleFieldsCount, totalFieldsCount: _totalFieldsCount };
  }, [overallStats, showEmptyFields]);

  const getItemIdToExpandedRowMap = useCallback(
    function (itemIds: string[], items: FieldVisConfig[]): ItemIdToExpandedRowMap {
      return itemIds.reduce((m: ItemIdToExpandedRowMap, fieldName: string) => {
        const item = items.find((fieldVisConfig) => fieldVisConfig.fieldName === fieldName);
        if (item !== undefined) {
          m[fieldName] = (
            <IndexBasedDataVisualizerExpandedRow
              item={item}
              dataView={currentDataView}
              combinedQuery={{ searchQueryLanguage, searchString }}
              onAddFilter={onAddFilter}
              totalDocuments={overallStats.totalCount}
            />
          );
        }
        return m;
      }, {} as ItemIdToExpandedRowMap);
    },
    [currentDataView, searchQueryLanguage, searchString, onAddFilter, overallStats.totalCount]
  );

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

  useEffect(() => {
    // Update data query manager if input string is updated
    data?.query.queryString.setQuery({
      query: searchString,
      language: searchQueryLanguage,
    });
  }, [data, searchQueryLanguage, searchString]);

  const hasValidTimeField = useMemo(
    () => currentDataView.timeFieldName !== undefined && currentDataView.timeFieldName !== '',
    [currentDataView.timeFieldName]
  );

  const dvPageHeader = css({
    [useEuiBreakpoint(['xs', 's', 'm', 'l', 'xl'])]: {
      flexDirection: 'column',
      alignItems: 'flex-start',
    },
  });

  const isWithinXl = useIsWithinMaxBreakpoint('xl');

  return (
    <EuiPageBody data-test-subj="dataVisualizerIndexPage" paddingSize="none" panelled={false}>
      <EuiFlexGroup gutterSize="m">
        <EuiFlexItem>
          <EuiPageContentHeader data-test-subj="dataVisualizerPageHeader" css={dvPageHeader}>
            <EuiPageContentHeaderSection>
              <EuiFlexGroup
                data-test-subj="dataViewTitleHeader"
                direction="row"
                alignItems="center"
                css={{ padding: `${euiTheme.euiSizeS} 0`, marginRight: `${euiTheme.euiSize}` }}
              >
                <EuiTitle size={'s'}>
                  <h2>{currentDataView.getName()}</h2>
                </EuiTitle>
                <DataVisualizerDataViewManagement
                  currentDataView={currentDataView}
                  useNewFieldsApi={true}
                />
              </EuiFlexGroup>
            </EuiPageContentHeaderSection>

            {isWithinXl ? <EuiSpacer size="m" /> : null}
            <EuiFlexGroup
              alignItems="center"
              justifyContent="flexEnd"
              gutterSize="s"
              data-test-subj="dataVisualizerTimeRangeSelectorSection"
            >
              {hasValidTimeField ? (
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
              ) : null}
              <EuiFlexItem grow={false}>
                <DatePickerWrapper
                  isAutoRefreshOnly={!hasValidTimeField}
                  showRefresh={!hasValidTimeField}
                  width="full"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPageContentHeader>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiPageContentBody>
        <EuiFlexGroup gutterSize="m" direction={isWithinXl ? 'column' : 'row'}>
          <EuiFlexItem>
            <EuiPanel hasShadow={false} hasBorder>
              <SearchPanel
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
              />

              {overallStats?.totalCount !== undefined && (
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
                      setRandomSamplerPreference={saveRandomSamplerPreference}
                    />
                  </EuiFlexGroup>
                </>
              )}
              <EuiSpacer size="m" />
              <FieldCountPanel
                showEmptyFields={showEmptyFields}
                toggleShowEmptyFields={toggleShowEmptyFields}
                fieldsCountStats={fieldsCountStats}
                metricsStats={metricsStats}
              />
              <EuiSpacer size="m" />
              <EuiProgress value={progress} max={100} size="xs" />
              <DataVisualizerTable<FieldVisConfig>
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
              />
            </EuiPanel>
          </EuiFlexItem>
          {isWithinXl ? <EuiSpacer size="m" /> : null}
          <EuiFlexItem grow={false}>
            <ActionsPanel
              dataView={currentDataView}
              searchQueryLanguage={searchQueryLanguage}
              searchString={searchString}
              getAdditionalLinks={getAdditionalLinks}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageContentBody>
    </EuiPageBody>
  );
};
