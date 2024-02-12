/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react-hooks/exhaustive-deps */

import { css } from '@emotion/react';
import React, { FC, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import type { Required } from 'utility-types';
import {
  FullTimeRangeSelector,
  mlTimefilterRefresh$,
  useTimefilter,
  DatePickerWrapper,
} from '@kbn/ml-date-picker';
import { TextBasedLangEditor } from '@kbn/text-based-languages/public';
import type { AggregateQuery } from '@kbn/es-query';
import { merge } from 'rxjs';
import { Comparators } from '@elastic/eui';

import {
  useEuiBreakpoint,
  useIsWithinMaxBreakpoint,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageTemplate,
  EuiPanel,
  EuiProgress,
  EuiSpacer,
} from '@elastic/eui';
import { usePageUrlState, useUrlState } from '@kbn/ml-url-state';
import { SEARCH_QUERY_LANGUAGE } from '@kbn/ml-query-utils';
import { getIndexPatternFromSQLQuery, getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import type { DataView } from '@kbn/data-views-plugin/common';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { getFieldType } from '@kbn/field-utils';
import { UI_SETTINGS } from '@kbn/data-service';
import type { SupportedFieldType } from '../../../../../common/types';
import { useCurrentEuiTheme } from '../../../common/hooks/use_current_eui_theme';
import type { FieldVisConfig } from '../../../common/components/stats_table/types';
import { DATA_VISUALIZER_INDEX_VIEWER } from '../../constants/index_data_visualizer_viewer';
import type { DataVisualizerIndexBasedAppState } from '../../types/index_data_visualizer_state';
import { useDataVisualizerKibana } from '../../../kibana_context';
import { GetAdditionalLinks } from '../../../common/components/results_links';
import { DocumentCountContent } from '../../../common/components/document_count_content';
import { useTimeBuckets } from '../../../common/hooks/use_time_buckets';
import {
  DataVisualizerTable,
  ItemIdToExpandedRowMap,
} from '../../../common/components/stats_table';
import type {
  MetricFieldsStats,
  TotalFieldsStats,
} from '../../../common/components/stats_table/components/field_count_stats';
import { filterFields } from '../../../common/components/fields_stats_grid/filter_fields';
import { IndexBasedDataVisualizerExpandedRow } from '../../../common/components/expanded_row/index_based_expanded_row';
import { getOrCreateDataViewByIndexPattern } from '../../search_strategy/requests/get_data_view_by_index_pattern';
import { FieldCountPanel } from '../../../common/components/field_count_panel';
import { useESQLFieldStatsData } from '../../hooks/esql/use_esql_field_stats_data';
import type { NonAggregatableField, OverallStats } from '../../types/overall_stats';
import { isESQLQuery } from '../../search_strategy/requests/esql_utils';
import { DEFAULT_BAR_TARGET } from '../../../common/constants';
import {
  type ESQLDefaultLimitSizeOption,
  ESQLDefaultLimitSizeSelect,
} from '../search_panel/esql/limit_size';
import { type Column, useESQLOverallStatsData } from '../../hooks/esql/use_esql_overall_stats_data';
import { type AggregatableField } from '../../types/esql_data_visualizer';

const defaults = getDefaultPageState();

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

interface ESQLDataVisualizerIndexBasedAppState extends DataVisualizerIndexBasedAppState {
  limitSize: ESQLDefaultLimitSizeOption;
}

export interface ESQLDataVisualizerIndexBasedPageUrlState {
  pageKey: typeof DATA_VISUALIZER_INDEX_VIEWER;
  pageUrlState: Required<ESQLDataVisualizerIndexBasedAppState>;
}

export const getDefaultDataVisualizerListState = (
  overrides?: Partial<ESQLDataVisualizerIndexBasedAppState>
): Required<ESQLDataVisualizerIndexBasedAppState> => ({
  pageIndex: 0,
  pageSize: 25,
  sortField: 'fieldName',
  sortDirection: 'asc',
  visibleFieldTypes: [],
  visibleFieldNames: [],
  limitSize: '10000',
  searchString: '',
  searchQuery: defaultSearchQuery,
  searchQueryLanguage: SEARCH_QUERY_LANGUAGE.KUERY,
  filters: [],
  showDistributions: true,
  showAllFields: false,
  showEmptyFields: false,
  probability: null,
  rndSamplerPref: 'off',
  ...overrides,
});

export interface IndexDataVisualizerESQLProps {
  getAdditionalLinks?: GetAdditionalLinks;
}

export const IndexDataVisualizerESQL: FC<IndexDataVisualizerESQLProps> = (dataVisualizerProps) => {
  const { services } = useDataVisualizerKibana();
  const { data, fieldFormats, uiSettings } = services;
  const euiTheme = useCurrentEuiTheme();

  const [query, setQuery] = useState<AggregateQuery>({ esql: '' });
  const [currentDataView, setCurrentDataView] = useState<DataView | undefined>();

  const updateDataView = (dv: DataView) => {
    if (dv.id !== currentDataView?.id) {
      setCurrentDataView(dv);
    }
  };
  const [lastRefresh, setLastRefresh] = useState(0);

  const _timeBuckets = useTimeBuckets();
  const timefilter = useTimefilter({
    timeRangeSelector: true,
    autoRefreshSelector: true,
  });

  const indexPattern = useMemo(() => {
    let indexPatternFromQuery = '';
    if ('sql' in query) {
      indexPatternFromQuery = getIndexPatternFromSQLQuery(query.sql);
    }
    if ('esql' in query) {
      indexPatternFromQuery = getIndexPatternFromESQLQuery(query.esql);
    }
    // we should find a better way to work with ESQL queries which dont need a dataview
    if (indexPatternFromQuery === '') {
      return undefined;
    }
    return indexPatternFromQuery;
  }, [query]);

  const restorableDefaults = useMemo(
    () => getDefaultDataVisualizerListState({}),
    // We just need to load the saved preference when the page is first loaded

    []
  );

  const [dataVisualizerListState, setDataVisualizerListState] =
    usePageUrlState<ESQLDataVisualizerIndexBasedPageUrlState>(
      DATA_VISUALIZER_INDEX_VIEWER,
      restorableDefaults
    );
  const [globalState, setGlobalState] = useUrlState('_g');

  const showEmptyFields =
    dataVisualizerListState.showEmptyFields ?? restorableDefaults.showEmptyFields;
  const toggleShowEmptyFields = () => {
    setDataVisualizerListState({
      ...dataVisualizerListState,
      showEmptyFields: !dataVisualizerListState.showEmptyFields,
    });
  };

  const limitSize = dataVisualizerListState.limitSize ?? restorableDefaults.limitSize;

  const updateLimitSize = (newLimitSize: ESQLDefaultLimitSizeOption) => {
    setDataVisualizerListState({
      ...dataVisualizerListState,
      limitSize: newLimitSize,
    });
  };

  useEffect(
    function updateAdhocDataViewFromQuery() {
      let unmounted = false;

      const update = async () => {
        if (!indexPattern) return;
        const dv = await getOrCreateDataViewByIndexPattern(
          data.dataViews,
          indexPattern,
          currentDataView
        );

        if (dv) {
          updateDataView(dv);
        }
      };

      if (!unmounted) {
        update();
      }

      return () => {
        unmounted = true;
      };
    },

    [indexPattern, data.dataViews, currentDataView]
  );

  /** Search strategy **/
  const fieldStatsRequest = useMemo(() => {
    // Obtain the interval to use for date histogram aggregations
    // (such as the document count chart). Aim for 75 bars.
    const buckets = _timeBuckets;

    const tf = timefilter;

    if (!buckets || !tf || (isESQLQuery(query) && query.esql === '')) return;
    const activeBounds = tf.getActiveBounds();

    let earliest: number | undefined;
    let latest: number | undefined;
    if (activeBounds !== undefined && currentDataView?.timeFieldName !== undefined) {
      earliest = activeBounds.min?.valueOf();
      latest = activeBounds.max?.valueOf();
    }

    const bounds = tf.getActiveBounds();
    const barTarget = uiSettings.get(UI_SETTINGS.HISTOGRAM_BAR_TARGET) ?? DEFAULT_BAR_TARGET;
    buckets.setInterval('auto');

    if (bounds) {
      buckets.setBounds(bounds);
      buckets.setBarTarget(barTarget);
    }

    const aggInterval = buckets.getInterval();

    const filter = currentDataView?.timeFieldName
      ? ({
          bool: {
            must: [],
            filter: [
              {
                range: {
                  [currentDataView.timeFieldName]: {
                    format: 'strict_date_optional_time',
                    gte: timefilter.getTime().from,
                    lte: timefilter.getTime().to,
                  },
                },
              },
            ],
            should: [],
            must_not: [],
          },
        } as QueryDslQueryContainer)
      : undefined;
    return {
      earliest,
      latest,
      aggInterval,
      intervalMs: aggInterval?.asMilliseconds(),
      searchQuery: query,
      limitSize,
      sessionId: undefined,
      indexPattern,
      timeFieldName: currentDataView?.timeFieldName,
      runtimeFieldMap: currentDataView?.getRuntimeMappings(),
      lastRefresh,
      filter,
    };
  }, [
    _timeBuckets,
    timefilter,
    currentDataView?.id,
    JSON.stringify(query),
    indexPattern,
    lastRefresh,
    limitSize,
  ]);

  useEffect(() => {
    // Force refresh on index pattern change
    setLastRefresh(Date.now());
  }, [setLastRefresh]);

  useEffect(() => {
    if (globalState?.time !== undefined) {
      timefilter.setTime({
        from: globalState.time.from,
        to: globalState.time.to,
      });
    }
  }, [JSON.stringify(globalState?.time), timefilter]);

  useEffect(() => {
    const timeUpdateSubscription = merge(
      timefilter.getTimeUpdate$(),
      timefilter.getAutoRefreshFetch$(),
      mlTimefilterRefresh$
    ).subscribe(() => {
      setGlobalState({
        time: timefilter.getTime(),
        refreshInterval: timefilter.getRefreshInterval(),
      });
      setLastRefresh(Date.now());
    });
    return () => {
      timeUpdateSubscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (globalState?.refreshInterval !== undefined) {
      timefilter.setRefreshInterval(globalState.refreshInterval);
    }
  }, [JSON.stringify(globalState?.refreshInterval), timefilter]);

  const {
    documentCountStats,
    totalCount,
    overallStats,
    overallStatsProgress,
    columns,
    cancelOverallStatsRequest,
  } = useESQLOverallStatsData(fieldStatsRequest);

  const [metricConfigs, setMetricConfigs] = useState(defaults.metricConfigs);
  const [metricsLoaded] = useState(defaults.metricsLoaded);
  const [metricsStats, setMetricsStats] = useState<undefined | MetricFieldsStats>();

  const [nonMetricConfigs, setNonMetricConfigs] = useState(defaults.nonMetricConfigs);
  const [nonMetricsLoaded] = useState(defaults.nonMetricsLoaded);

  const [fieldStatFieldsToFetch, setFieldStatFieldsToFetch] = useState<Column[] | undefined>();

  const visibleFieldTypes =
    dataVisualizerListState.visibleFieldTypes ?? restorableDefaults.visibleFieldTypes;

  const visibleFieldNames =
    dataVisualizerListState.visibleFieldNames ?? restorableDefaults.visibleFieldNames;

  useEffect(
    function updateFieldStatFieldsToFetch() {
      const { sortField, sortDirection } = dataVisualizerListState;

      // Otherwise, sort the list of fields by the initial sort field and sort direction
      // Then divide into chunks by the initial page size

      const itemsSorter = Comparators.property(
        sortField as string,
        Comparators.default(sortDirection as 'asc' | 'desc' | undefined)
      );

      const preslicedSortedConfigs = [...nonMetricConfigs, ...metricConfigs]
        .map((c) => ({
          ...c,
          name: c.fieldName,
          docCount: c.stats?.count,
          cardinality: c.stats?.cardinality,
        }))
        .sort(itemsSorter);

      const filteredItems = filterFields(
        preslicedSortedConfigs,
        dataVisualizerListState.visibleFieldNames,
        dataVisualizerListState.visibleFieldTypes
      );

      const { pageIndex, pageSize } = dataVisualizerListState;

      const pageOfConfigs = filteredItems.filteredFields
        ?.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)
        .filter((d) => d.existsInDocs === true);

      setFieldStatFieldsToFetch(pageOfConfigs);
    },
    [
      dataVisualizerListState.pageIndex,
      dataVisualizerListState.pageSize,
      dataVisualizerListState.sortField,
      dataVisualizerListState.sortDirection,
      nonMetricConfigs,
      metricConfigs,
    ]
  );

  const { fieldStats, fieldStatsProgress, cancelFieldStatsRequest } = useESQLFieldStatsData({
    searchQuery: fieldStatsRequest?.searchQuery,
    columns: fieldStatFieldsToFetch,
    filter: fieldStatsRequest?.filter,
    limitSize: fieldStatsRequest?.limitSize,
  });

  const createMetricCards = useCallback(() => {
    if (!columns || !overallStats) return;
    const configs: FieldVisConfig[] = [];
    const aggregatableExistsFields: AggregatableField[] =
      overallStats.aggregatableExistsFields || [];

    const allMetricFields = columns.filter((f) => {
      return f.secondaryType === KBN_FIELD_TYPES.NUMBER;
    });

    const metricExistsFields = allMetricFields.filter((f) => {
      return aggregatableExistsFields.find((existsF) => {
        return existsF.fieldName === f.name;
      });
    });

    let _aggregatableFields: AggregatableField[] = overallStats.aggregatableExistsFields;
    if (allMetricFields.length !== metricExistsFields.length && metricsLoaded === true) {
      _aggregatableFields = _aggregatableFields.concat(overallStats.aggregatableNotExistsFields);
    }

    const metricFieldsToShow =
      metricsLoaded === true && showEmptyFields === true ? allMetricFields : metricExistsFields;

    metricFieldsToShow.forEach((field) => {
      const fieldData = _aggregatableFields.find((f) => {
        return f.fieldName === field.name;
      });
      if (!fieldData) return;

      const metricConfig: FieldVisConfig = {
        ...field,
        ...fieldData,
        loading: fieldData?.existsInDocs ?? true,
        fieldFormat:
          currentDataView?.getFormatterForFieldNoDefault(field.name) ??
          fieldFormats.deserialize({ id: field.secondaryType }),
        aggregatable: true,
        deletable: false,
        type: getFieldType(field) as SupportedFieldType,
      };

      configs.push(metricConfig);
    });

    setMetricsStats({
      totalMetricFieldsCount: allMetricFields.length,
      visibleMetricsCount: metricFieldsToShow.length,
    });
    setMetricConfigs(configs);
  }, [metricsLoaded, overallStats, showEmptyFields, columns, currentDataView?.id]);

  const createNonMetricCards = useCallback(() => {
    if (!columns || !overallStats) return;

    const allNonMetricFields = columns.filter((f) => {
      return f.secondaryType !== KBN_FIELD_TYPES.NUMBER;
    });
    // Obtain the list of all non-metric fields which appear in documents
    // (aggregatable or not aggregatable).
    const populatedNonMetricFields: Column[] = []; // Kibana index pattern non metric fields.
    let nonMetricFieldData: Array<AggregatableField | NonAggregatableField> = []; // Basic non metric field data loaded from requesting overall stats.
    const aggregatableExistsFields: AggregatableField[] =
      overallStats.aggregatableExistsFields || [];
    const nonAggregatableExistsFields: NonAggregatableField[] =
      overallStats.nonAggregatableExistsFields || [];

    allNonMetricFields.forEach((f) => {
      const checkAggregatableField = aggregatableExistsFields.find(
        (existsField) => existsField.fieldName === f.name
      );

      if (checkAggregatableField !== undefined) {
        populatedNonMetricFields.push(f);
        nonMetricFieldData.push(checkAggregatableField);
      } else {
        const checkNonAggregatableField = nonAggregatableExistsFields.find(
          (existsField) => existsField.fieldName === f.name
        );

        if (checkNonAggregatableField !== undefined) {
          populatedNonMetricFields.push(f);
          nonMetricFieldData.push(checkNonAggregatableField);
        }
      }
    });

    if (allNonMetricFields.length !== nonMetricFieldData.length && showEmptyFields === true) {
      // Combine the field data obtained from Elasticsearch into a single array.
      nonMetricFieldData = nonMetricFieldData.concat(
        overallStats.aggregatableNotExistsFields,
        overallStats.nonAggregatableNotExistsFields
      );
    }

    const nonMetricFieldsToShow = showEmptyFields ? allNonMetricFields : populatedNonMetricFields;

    const configs: FieldVisConfig[] = [];

    nonMetricFieldsToShow.forEach((field) => {
      const fieldData = nonMetricFieldData.find((f) => f.fieldName === field.name);
      const nonMetricConfig: Partial<FieldVisConfig> = {
        ...(fieldData ? fieldData : {}),
        secondaryType: getFieldType(field) as SupportedFieldType,
        loading: fieldData?.existsInDocs ?? true,
        deletable: false,
        fieldFormat:
          currentDataView?.getFormatterForFieldNoDefault(field.name) ??
          fieldFormats.deserialize({ id: field.secondaryType }),
      };

      // Map the field type from the Kibana index pattern to the field type
      // used in the data visualizer.
      const dataVisualizerType = getFieldType(field) as SupportedFieldType;
      if (dataVisualizerType !== undefined) {
        nonMetricConfig.type = dataVisualizerType;
      } else {
        // Add a flag to indicate that this is one of the 'other' Kibana
        // field types that do not yet have a specific card type.
        nonMetricConfig.type = field.type as SupportedFieldType;
        nonMetricConfig.isUnsupportedType = true;
      }

      if (field.name !== nonMetricConfig.fieldName) {
        nonMetricConfig.displayName = field.name;
      }

      configs.push(nonMetricConfig as FieldVisConfig);
    });

    setNonMetricConfigs(configs);
  }, [columns, nonMetricsLoaded, overallStats, showEmptyFields, currentDataView?.id]);

  const fieldsCountStats: TotalFieldsStats | undefined = useMemo(() => {
    if (!overallStats) return;

    let _visibleFieldsCount = 0;
    let _totalFieldsCount = 0;
    Object.keys(overallStats).forEach((key) => {
      const fieldsGroup = overallStats[key as keyof typeof overallStats];
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

  useEffect(() => {
    createMetricCards();
    createNonMetricCards();
  }, [overallStats, showEmptyFields]);

  const configs = useMemo(() => {
    let combinedConfigs = [...nonMetricConfigs, ...metricConfigs];

    combinedConfigs = filterFields(
      combinedConfigs,
      visibleFieldNames,
      visibleFieldTypes
    ).filteredFields;

    if (fieldStatsProgress.loaded === 100 && fieldStats) {
      combinedConfigs = combinedConfigs.map((c) => {
        const loadedFullStats = fieldStats.get(c.fieldName) ?? {};
        return loadedFullStats
          ? {
              ...c,
              loading: false,
              stats: { ...c.stats, ...loadedFullStats },
            }
          : c;
      });
    }
    return combinedConfigs;
  }, [
    nonMetricConfigs,
    metricConfigs,
    visibleFieldTypes,
    visibleFieldNames,
    fieldStatsProgress.loaded,
    dataVisualizerListState.pageIndex,
    dataVisualizerListState.pageSize,
  ]);

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

  const getItemIdToExpandedRowMap = useCallback(
    function (itemIds: string[], items: FieldVisConfig[]): ItemIdToExpandedRowMap {
      return itemIds.reduce((m: ItemIdToExpandedRowMap, fieldName: string) => {
        const item = items.find((fieldVisConfig) => fieldVisConfig.fieldName === fieldName);
        if (item !== undefined) {
          m[fieldName] = (
            <IndexBasedDataVisualizerExpandedRow
              item={item}
              dataView={currentDataView}
              combinedQuery={{ searchQueryLanguage: 'kuery', searchString: '' }}
              totalDocuments={totalCount}
              typeAccessor="secondaryType"
            />
          );
        }
        return m;
      }, {} as ItemIdToExpandedRowMap);
    },
    [currentDataView, totalCount]
  );

  const hasValidTimeField = useMemo(
    () =>
      currentDataView &&
      currentDataView.timeFieldName !== undefined &&
      currentDataView.timeFieldName !== '',
    [currentDataView]
  );

  const isWithinLargeBreakpoint = useIsWithinMaxBreakpoint('l');
  const dvPageHeader = css({
    [useEuiBreakpoint(['xs', 's', 'm', 'l'])]: {
      flexDirection: 'column',
      alignItems: 'flex-start',
    },
  });

  const combinedProgress = useMemo(
    () => overallStatsProgress.loaded * 0.3 + fieldStatsProgress.loaded * 0.7,
    [overallStatsProgress.loaded, fieldStatsProgress.loaded]
  );

  // Query that has been typed, but has not submitted with cmd + enter
  const [localQuery, setLocalQuery] = useState<AggregateQuery>({ esql: '' });

  const onQueryUpdate = async (q?: AggregateQuery) => {
    // When user submits a new query
    // resets all current requests and other data
    if (cancelOverallStatsRequest) {
      cancelOverallStatsRequest();
    }
    if (cancelFieldStatsRequest) {
      cancelFieldStatsRequest();
    }
    // Reset field stats to fetch state
    setFieldStatFieldsToFetch(undefined);
    setMetricConfigs(defaults.metricConfigs);
    setNonMetricConfigs(defaults.nonMetricConfigs);
    if (q) {
      setQuery(q);
    }
  };

  useEffect(
    function resetFieldStatsFieldToFetch() {
      // If query returns 0 document, no need to do more work here
      if (totalCount === undefined || totalCount === 0) {
        setFieldStatFieldsToFetch(undefined);
        return;
      }
    },
    [totalCount]
  );

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
          />

          {isWithinLargeBreakpoint ? <EuiSpacer size="m" /> : null}
          <EuiFlexGroup
            alignItems="center"
            justifyContent="flexEnd"
            gutterSize="s"
            data-test-subj="dataVisualizerTimeRangeSelectorSection"
          >
            {hasValidTimeField && currentDataView ? (
              <EuiFlexItem grow={false}>
                <FullTimeRangeSelector
                  frozenDataPreference={'exclude-frozen'}
                  setFrozenDataPreference={() => {}}
                  dataView={currentDataView}
                  query={undefined}
                  disabled={false}
                  timefilter={timefilter}
                />
              </EuiFlexItem>
            ) : null}
            <EuiFlexItem grow={false}>
              <DatePickerWrapper
                isAutoRefreshOnly={false}
                showRefresh={false}
                width="full"
                isDisabled={!hasValidTimeField}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPageTemplate.Header>
        <EuiSpacer size="m" />
        <TextBasedLangEditor
          query={localQuery}
          onTextLangQueryChange={setLocalQuery}
          onTextLangQuerySubmit={onQueryUpdate}
          expandCodeEditor={() => false}
          isCodeEditorExpanded={true}
          detectTimestamp={true}
          hideMinimizeButton={true}
          hideRunQueryText={false}
        />

        <EuiFlexGroup gutterSize="m" direction={isWithinLargeBreakpoint ? 'column' : 'row'}>
          <EuiFlexItem>
            <EuiPanel hasShadow={false} hasBorder grow={false}>
              {totalCount !== undefined && (
                <>
                  <EuiFlexGroup gutterSize="s" direction="column">
                    <DocumentCountContent
                      documentCountStats={documentCountStats}
                      totalCount={totalCount}
                      samplingProbability={1}
                      loading={false}
                      showSettings={false}
                    />
                  </EuiFlexGroup>
                </>
              )}
              <EuiSpacer size="m" />
              <EuiFlexGroup direction="row">
                <FieldCountPanel
                  showEmptyFields={showEmptyFields}
                  toggleShowEmptyFields={toggleShowEmptyFields}
                  fieldsCountStats={fieldsCountStats}
                  metricsStats={metricsStats}
                />
                <EuiFlexItem />
                <ESQLDefaultLimitSizeSelect
                  limitSize={limitSize}
                  onChangeLimitSize={updateLimitSize}
                />
              </EuiFlexGroup>
              <EuiSpacer size="m" />
              <EuiProgress value={combinedProgress} max={100} size="xs" />
              <DataVisualizerTable<FieldVisConfig>
                items={configs}
                pageState={dataVisualizerListState}
                updatePageState={setDataVisualizerListState}
                getItemIdToExpandedRowMap={getItemIdToExpandedRowMap}
                loading={overallStatsProgress.isRunning}
                overallStatsRunning={overallStatsProgress.isRunning}
                showPreviewByDefault={dataVisualizerListState.showDistributions ?? true}
                onChange={setDataVisualizerListState}
                totalCount={totalCount}
              />
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};
