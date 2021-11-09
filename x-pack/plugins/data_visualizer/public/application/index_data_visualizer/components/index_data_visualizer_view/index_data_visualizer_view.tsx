/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, Fragment, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPage,
  EuiPageBody,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiPanel,
  EuiProgress,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { EuiTableActionsColumnType } from '@elastic/eui/src/components/basic_table/table_types';
import { FormattedMessage } from '@kbn/i18n/react';
import { Required } from 'utility-types';
import { i18n } from '@kbn/i18n';
import { Filter } from '@kbn/es-query';
import { Query, generateFilters } from '../../../../../../../../src/plugins/data/public';
import { FullTimeRangeSelector } from '../full_time_range_selector';
import { usePageUrlState, useUrlState } from '../../../common/util/url_state';
import {
  DataVisualizerTable,
  ItemIdToExpandedRowMap,
} from '../../../common/components/stats_table';
import { FieldVisConfig } from '../../../common/components/stats_table/types';
import type { TotalFieldsStats } from '../../../common/components/stats_table/components/field_count_stats';
import { OverallStats } from '../../types/overall_stats';
import { getActions } from '../../../common/components/field_data_row/action_menu';
import { IndexBasedDataVisualizerExpandedRow } from '../../../common/components/expanded_row/index_based_expanded_row';
import { DATA_VISUALIZER_INDEX_VIEWER } from '../../constants/index_data_visualizer_viewer';
import { DataVisualizerIndexBasedAppState } from '../../types/index_data_visualizer_state';
import { SEARCH_QUERY_LANGUAGE, SearchQueryLanguage } from '../../types/combined_query';
import { JobFieldType, SavedSearchSavedObject } from '../../../../../common/types';
import { useDataVisualizerKibana } from '../../../kibana_context';
import { FieldCountPanel } from '../../../common/components/field_count_panel';
import { DocumentCountContent } from '../../../common/components/document_count_content';
import { OMIT_FIELDS } from '../../../../../common';
import { kbnTypeToJobType } from '../../../common/util/field_types_utils';
import { SearchPanel } from '../search_panel';
import { ActionsPanel } from '../actions_panel';
import { DatePickerWrapper } from '../../../common/components/date_picker_wrapper';
import { HelpMenu } from '../../../common/components/help_menu';
import { createMergedEsQuery } from '../../utils/saved_search_utils';
import { DataVisualizerIndexPatternManagement } from '../index_pattern_management';
import { ResultLink } from '../../../common/components/results_links';
import { IndexPatternField, IndexPattern } from '../../../../../../../../src/plugins/data/common';
import { useDataVisualizerGridData } from '../../hooks/use_data_visualizer_grid_data';
import { DataVisualizerGridInput } from '../../embeddables/grid_embeddable/grid_embeddable';
import './_index.scss';

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
  ...overrides,
});

export interface IndexDataVisualizerViewProps {
  currentIndexPattern: IndexPattern;
  currentSavedSearch: SavedSearchSavedObject | null;
  additionalLinks?: ResultLink[];
}
const restorableDefaults = getDefaultDataVisualizerListState();

export const IndexDataVisualizerView: FC<IndexDataVisualizerViewProps> = (dataVisualizerProps) => {
  const { services } = useDataVisualizerKibana();
  const { docLinks, notifications, uiSettings, data } = services;
  const { toasts } = notifications;

  const [dataVisualizerListState, setDataVisualizerListState] = usePageUrlState(
    DATA_VISUALIZER_INDEX_VIEWER,
    restorableDefaults
  );
  const [globalState, setGlobalState] = useUrlState('_g');

  const [currentSavedSearch, setCurrentSavedSearch] = useState(
    dataVisualizerProps.currentSavedSearch
  );

  const { currentIndexPattern, additionalLinks } = dataVisualizerProps;

  useEffect(() => {
    if (dataVisualizerProps?.currentSavedSearch !== undefined) {
      setCurrentSavedSearch(dataVisualizerProps?.currentSavedSearch);
    }
  }, [dataVisualizerProps?.currentSavedSearch]);

  useEffect(() => {
    if (!currentIndexPattern.isTimeBased()) {
      toasts.addWarning({
        title: i18n.translate(
          'xpack.dataVisualizer.index.indexPatternNotBasedOnTimeSeriesNotificationTitle',
          {
            defaultMessage: 'The index pattern {indexPatternTitle} is not based on a time series',
            values: { indexPatternTitle: currentIndexPattern.title },
          }
        ),
        text: i18n.translate(
          'xpack.dataVisualizer.index.indexPatternNotBasedOnTimeSeriesNotificationDescription',
          {
            defaultMessage: 'Anomaly detection only runs over time-based indices',
          }
        ),
      });
    }
  }, [currentIndexPattern, toasts]);

  const indexPatternFields: IndexPatternField[] = currentIndexPattern.fields;

  const fieldTypes = useMemo(() => {
    // Obtain the list of non metric field types which appear in the index pattern.
    const indexedFieldTypes: JobFieldType[] = [];
    indexPatternFields.forEach((field) => {
      if (!OMIT_FIELDS.includes(field.name) && field.scripted !== true) {
        const dataVisualizerType: JobFieldType | undefined = kbnTypeToJobType(field);
        if (dataVisualizerType !== undefined && !indexedFieldTypes.includes(dataVisualizerType)) {
          indexedFieldTypes.push(dataVisualizerType);
        }
      }
    });
    return indexedFieldTypes.sort();
  }, [indexPatternFields]);

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

  const samplerShardSize =
    dataVisualizerListState.samplerShardSize ?? restorableDefaults.samplerShardSize;
  const setSamplerShardSize = (value: number) => {
    setDataVisualizerListState({ ...dataVisualizerListState, samplerShardSize: value });
  };

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
      indexPattern: currentIndexPattern,
      savedSearch: currentSavedSearch,
      visibleFieldNames,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndexPattern.id, currentSavedSearch?.id, visibleFieldNames]);

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
  } = useDataVisualizerGridData(input, dataVisualizerListState, setGlobalState);

  useEffect(() => {
    return () => {
      // When navigating away from the index pattern
      // Reset all previously set filters
      // to make sure new page doesn't have unrelated filters
      data.query.filterManager.removeAll();
    };
  }, [currentIndexPattern.id, data.query.filterManager]);

  useEffect(() => {
    // Force refresh on index pattern change
    setLastRefresh(Date.now());
  }, [currentIndexPattern.id, setLastRefresh]);

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
    (field: IndexPatternField | string, values: string, operation: '+' | '-') => {
      const newFilters = generateFilters(
        data.query.filterManager,
        field,
        values,
        operation,
        String(currentIndexPattern.id)
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
        currentIndexPattern,
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
      currentIndexPattern,
      data.query.filterManager,
      searchQueryLanguage,
      searchString,
      setSearchParams,
      uiSettings,
    ]
  );

  const wizardPanelWidth = '280px';

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
              indexPattern={currentIndexPattern}
              combinedQuery={{ searchQueryLanguage, searchString }}
              onAddFilter={onAddFilter}
            />
          );
        }
        return m;
      }, {} as ItemIdToExpandedRowMap);
    },
    [currentIndexPattern, searchQueryLanguage, searchString, onAddFilter]
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

  // Inject custom action column for the index based visualizer
  // Hide the column completely if no access to any of the plugins
  const extendedColumns = useMemo(() => {
    const actions = getActions(
      currentIndexPattern,
      services,
      {
        searchQueryLanguage,
        searchString,
      },
      actionFlyoutRef
    );
    if (!Array.isArray(actions) || actions.length < 1) return;

    const actionColumn: EuiTableActionsColumnType<FieldVisConfig> = {
      name: (
        <FormattedMessage
          id="xpack.dataVisualizer.index.dataGrid.actionsColumnLabel"
          defaultMessage="Actions"
        />
      ),
      actions,
      width: '100px',
    };

    return [actionColumn];
  }, [currentIndexPattern, services, searchQueryLanguage, searchString]);

  const helpLink = docLinks.links.ml.guide;

  return (
    <Fragment>
      <EuiPage data-test-subj="dataVisualizerIndexPage">
        <EuiPageBody>
          <EuiFlexGroup gutterSize="m">
            <EuiFlexItem>
              <EuiPageContentHeader className="dataVisualizerPageHeader">
                <EuiPageContentHeaderSection>
                  <div className="dataViewTitleHeader">
                    <EuiTitle>
                      <h1>{currentIndexPattern.title}</h1>
                    </EuiTitle>
                    <DataVisualizerIndexPatternManagement
                      currentIndexPattern={currentIndexPattern}
                      useNewFieldsApi={true}
                    />
                  </div>
                </EuiPageContentHeaderSection>

                <EuiFlexGroup
                  alignItems="center"
                  justifyContent="flexEnd"
                  gutterSize="s"
                  data-test-subj="dataVisualizerTimeRangeSelectorSection"
                >
                  {currentIndexPattern.timeFieldName !== undefined && (
                    <EuiFlexItem grow={false}>
                      <FullTimeRangeSelector
                        indexPattern={currentIndexPattern}
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
          <EuiSpacer size="m" />
          <EuiPageContentBody>
            <EuiFlexGroup gutterSize="m">
              <EuiFlexItem>
                <EuiPanel>
                  {overallStats?.totalCount !== undefined && (
                    <EuiFlexItem grow={true}>
                      <DocumentCountContent
                        documentCountStats={documentCountStats}
                        totalCount={overallStats.totalCount}
                      />
                    </EuiFlexItem>
                  )}
                  <SearchPanel
                    indexPattern={currentIndexPattern}
                    searchString={searchString}
                    searchQuery={searchQuery}
                    searchQueryLanguage={searchQueryLanguage}
                    setSearchParams={setSearchParams}
                    samplerShardSize={samplerShardSize}
                    setSamplerShardSize={setSamplerShardSize}
                    overallStats={overallStats}
                    indexedFieldTypes={fieldTypes}
                    setVisibleFieldTypes={setVisibleFieldTypes}
                    visibleFieldTypes={visibleFieldTypes}
                    visibleFieldNames={visibleFieldNames}
                    setVisibleFieldNames={setVisibleFieldNames}
                    showEmptyFields={showEmptyFields}
                    onAddFilter={onAddFilter}
                  />
                  <EuiSpacer size={'m'} />
                  <FieldCountPanel
                    showEmptyFields={showEmptyFields}
                    toggleShowEmptyFields={toggleShowEmptyFields}
                    fieldsCountStats={fieldsCountStats}
                    metricsStats={metricsStats}
                  />
                  <EuiSpacer size={'m'} />
                  <EuiProgress value={progress} max={100} size={'xs'} />
                  <DataVisualizerTable<FieldVisConfig>
                    items={configs}
                    pageState={dataVisualizerListState}
                    updatePageState={setDataVisualizerListState}
                    getItemIdToExpandedRowMap={getItemIdToExpandedRowMap}
                    extendedColumns={extendedColumns}
                    loading={progress < 100}
                  />
                </EuiPanel>
              </EuiFlexItem>
              <EuiFlexItem grow={false} style={{ width: wizardPanelWidth }}>
                <ActionsPanel
                  indexPattern={currentIndexPattern}
                  searchQueryLanguage={searchQueryLanguage}
                  searchString={searchString}
                  additionalLinks={additionalLinks ?? []}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPageContentBody>
        </EuiPageBody>
      </EuiPage>

      <HelpMenu docLink={helpLink} />
    </Fragment>
  );
};
