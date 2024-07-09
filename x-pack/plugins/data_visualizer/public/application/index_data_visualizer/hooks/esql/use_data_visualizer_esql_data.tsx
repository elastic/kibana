/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { mlTimefilterRefresh$, useTimefilter } from '@kbn/ml-date-picker';
import { merge } from 'rxjs';
import { Comparators } from '@elastic/eui';
import { useUrlState } from '@kbn/ml-url-state';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { getFieldType } from '@kbn/field-utils';
import { UI_SETTINGS } from '@kbn/data-service';
import useObservable from 'react-use/lib/useObservable';
import { SEARCH_QUERY_LANGUAGE } from '@kbn/ml-query-utils';
import type { KibanaExecutionContext } from '@kbn/core-execution-context-common';
import { useExecutionContext } from '@kbn/kibana-react-plugin/public';
import type { AggregateQuery, Query } from '@kbn/es-query';
import { useTimeBuckets } from '@kbn/ml-time-buckets';
import { buildEsQuery } from '@kbn/es-query';
import usePrevious from 'react-use/lib/usePrevious';
import type { FieldVisConfig } from '../../../../../common/types/field_vis_config';
import type { SupportedFieldType } from '../../../../../common/types/job_field_type';
import type { ItemIdToExpandedRowMap } from '../../../common/components/stats_table';
import type {
  MetricFieldsStats,
  TotalFieldsStats,
} from '../../../common/components/stats_table/components/field_count_stats';
import { filterFields } from '../../../common/components/fields_stats_grid/filter_fields';
import { IndexBasedDataVisualizerExpandedRow } from '../../../common/components/expanded_row/index_based_expanded_row';
import { useESQLFieldStatsData } from './use_esql_field_stats_data';
import type { NonAggregatableField } from '../../types/overall_stats';
import type { ESQLQuery } from '../../search_strategy/requests/esql_utils';
import { isESQLQuery } from '../../search_strategy/requests/esql_utils';
import { DEFAULT_BAR_TARGET } from '../../../common/constants';
import { type Column, useESQLOverallStatsData } from './use_esql_overall_stats_data';
import { type AggregatableField } from '../../types/esql_data_visualizer';
import { useDataVisualizerKibana } from '../../../kibana_context';
import type {
  ESQLDataVisualizerGridEmbeddableState,
  ESQLDataVisualizerIndexBasedAppState,
} from '../../embeddables/grid_embeddable/types';
import { getDefaultPageState } from '../../constants/index_data_visualizer_viewer';
import { DEFAULT_ESQL_LIMIT } from '../../constants/esql_constants';

type AnyQuery = Query | AggregateQuery;

const defaultSearchQuery = {
  match_all: {},
};

const FALLBACK_ESQL_QUERY: ESQLQuery = { esql: '' };
const DEFAULT_LIMIT_SIZE = '10000';
const defaults = getDefaultPageState();

export const getDefaultESQLDataVisualizerListState = (
  overrides?: Partial<ESQLDataVisualizerIndexBasedAppState>
): Required<ESQLDataVisualizerIndexBasedAppState> => ({
  pageIndex: 0,
  pageSize: 25,
  sortField: 'fieldName',
  sortDirection: 'asc',
  visibleFieldTypes: [],
  visibleFieldNames: [],
  limitSize: DEFAULT_LIMIT_SIZE,
  searchString: '',
  searchQuery: defaultSearchQuery,
  searchQueryLanguage: SEARCH_QUERY_LANGUAGE.KUERY,
  filters: [],
  showDistributions: true,
  showAllFields: false,
  showEmptyFields: false,
  probability: null,
  rndSamplerPref: 'off',
  query: { esql: '' },
  ...overrides,
});
export const useESQLDataVisualizerData = (
  input: ESQLDataVisualizerGridEmbeddableState,
  dataVisualizerListState: ESQLDataVisualizerIndexBasedAppState
) => {
  const [lastRefresh, setLastRefresh] = useState(0);
  const { services } = useDataVisualizerKibana();
  const { uiSettings, executionContext, data } = services;

  const parentExecutionContext = useObservable(executionContext?.context$);

  const componentExecutionContext: KibanaExecutionContext = useMemo(() => {
    const child: KibanaExecutionContext = {
      type: 'visualization',
      name: 'esql_field_statistics_table',
      id: input.id,
    };

    return {
      ...(parentExecutionContext ? parentExecutionContext : {}),
      child,
    };
  }, [parentExecutionContext, input.id]);

  useExecutionContext(executionContext, componentExecutionContext);

  const _timeBuckets = useTimeBuckets(uiSettings);
  const timefilter = useTimefilter({
    timeRangeSelector: true,
    autoRefreshSelector: true,
  });

  const [delayedESQLQuery, setDelayedESQLQuery] = useState<ESQLQuery | undefined>(input?.esqlQuery);
  const previousQuery = usePrevious(delayedESQLQuery);

  const { currentDataView, parentQuery, parentFilters, query, visibleFieldNames, indexPattern } =
    useMemo(() => {
      let q = FALLBACK_ESQL_QUERY;
      if (input?.query && isESQLQuery(input?.query)) q = input.query;
      if (delayedESQLQuery && isESQLQuery(delayedESQLQuery)) q = delayedESQLQuery;
      if (input?.savedSearch && isESQLQuery(input.savedSearch.searchSource.getField('query'))) {
        q = input.savedSearch.searchSource.getField('query') as ESQLQuery;
      }
      return {
        currentDataView: input.dataView,
        query: q,
        // It's possible that in a dashboard setting, we will have additional filters and queries
        parentQuery: input?.query,
        parentFilters: input?.filters,
        visibleFieldNames: input?.visibleFieldNames ?? [],
        indexPattern: input?.indexPattern,
      };
    }, [
      input.query,
      input.savedSearch,
      input.dataView,
      input?.filters,
      input?.visibleFieldNames,
      input?.indexPattern,
      delayedESQLQuery,
    ]);

  const restorableDefaults = useMemo(
    () => getDefaultESQLDataVisualizerListState(dataVisualizerListState),
    // We just need to load the saved preference when the page is first loaded
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const [globalState, setGlobalState] = useUrlState('_g');

  const showEmptyFields =
    dataVisualizerListState.showEmptyFields ?? restorableDefaults.showEmptyFields;
  const limitSize = dataVisualizerListState.limitSize ?? restorableDefaults.limitSize;

  /** Search strategy **/
  const fieldStatsRequest = useMemo(
    () => {
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

      let filter: QueryDslQueryContainer = buildEsQuery(
        input.dataView,
        (Array.isArray(parentQuery) ? parentQuery : [parentQuery]) as AnyQuery | AnyQuery[],
        parentFilters ?? []
      );
      const timeRange = input.timeRange ? input.timeRange : timefilter.getTime();

      if (currentDataView?.timeFieldName) {
        if (Array.isArray(filter?.bool?.filter)) {
          filter.bool!.filter!.push({
            range: {
              [currentDataView.timeFieldName]: {
                format: 'strict_date_optional_time',
                gte: timeRange.from,
                lte: timeRange.to,
              },
            },
          });
        } else {
          filter = {
            bool: {
              must: [],
              filter: [
                {
                  range: {
                    [currentDataView.timeFieldName]: {
                      format: 'strict_date_optional_time',
                      gte: timeRange.from,
                      lte: timeRange.to,
                    },
                  },
                },
              ],
              should: [],
              must_not: [],
            },
          } as QueryDslQueryContainer;
        }
      }
      return {
        earliest,
        latest,
        aggInterval,
        intervalMs: aggInterval?.asMilliseconds(),
        searchQuery: query,
        limit: limitSize !== undefined ? parseInt(limitSize, 10) : DEFAULT_ESQL_LIMIT,
        sessionId: undefined,
        indexPattern,
        timeFieldName: currentDataView?.timeFieldName,
        runtimeFieldMap: currentDataView?.getRuntimeMappings(),
        lastRefresh,
        filter,
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      _timeBuckets,
      timefilter,
      currentDataView?.id,
      // eslint-disable-next-line react-hooks/exhaustive-deps
      JSON.stringify({ query, parentQuery, parentFilters }),
      indexPattern,
      lastRefresh,
      limitSize,
      input.timeRange?.from,
      input.timeRange?.to,
    ]
  );

  useEffect(() => {
    // Force refresh on index pattern change
    setLastRefresh(Date.now());
  }, [setLastRefresh]);

  useEffect(
    () => {
      if (globalState?.time !== undefined) {
        timefilter.setTime({
          from: globalState.time.from,
          to: globalState.time.to,
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(globalState?.time), timefilter]
  );

  useEffect(
    () => {
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
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(
    () => {
      if (globalState?.refreshInterval !== undefined) {
        timefilter.setRefreshInterval(globalState.refreshInterval);
      }
    }, // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(globalState?.refreshInterval), timefilter]
  );

  const {
    documentCountStats,
    totalCount,
    overallStats,
    totalFields,
    overallStatsProgress,
    columns,
    cancelOverallStatsRequest,
    timeFieldName,
    queryHistoryStatus,
    exampleDocs,
  } = useESQLOverallStatsData(fieldStatsRequest);

  const [metricConfigs, setMetricConfigs] = useState(defaults.metricConfigs);
  const [metricsLoaded] = useState(defaults.metricsLoaded);
  const [metricsStats, setMetricsStats] = useState<undefined | MetricFieldsStats>();

  const [nonMetricConfigs, setNonMetricConfigs] = useState(defaults.nonMetricConfigs);
  const [nonMetricsLoaded] = useState(defaults.nonMetricsLoaded);

  const [fieldStatFieldsToFetch, setFieldStatFieldsToFetch] = useState<Column[] | undefined>();

  const visibleFieldTypes =
    dataVisualizerListState.visibleFieldTypes ?? restorableDefaults.visibleFieldTypes;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    limit: fieldStatsRequest?.limit ?? DEFAULT_ESQL_LIMIT,
  });

  useEffect(
    function resetFieldStatsFieldToFetch() {
      // If query returns 0 document, no need to do more work here
      if (totalCount === undefined) {
        setFieldStatFieldsToFetch(undefined);
      }

      if (totalCount === 0) {
        setMetricConfigs(defaults.metricConfigs);
        setNonMetricConfigs(defaults.nonMetricConfigs);
        setMetricsStats(undefined);
        setFieldStatFieldsToFetch(undefined);
      }
    },
    [totalCount]
  );

  const createMetricCards = useCallback(
    () => {
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
          fieldFormat: data.fieldFormats.deserialize({ id: field.secondaryType }),
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
    }, // eslint-disable-next-line react-hooks/exhaustive-deps
    [metricsLoaded, overallStats, showEmptyFields, columns, currentDataView?.id]
  );

  const createNonMetricCards = useCallback(
    () => {
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
          fieldFormat: data.fieldFormats.deserialize({ id: field.secondaryType }),
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
    }, // eslint-disable-next-line react-hooks/exhaustive-deps
    [columns, nonMetricsLoaded, overallStats, showEmptyFields]
  );

  const fieldsCountStats: TotalFieldsStats | undefined = useMemo(() => {
    if (!overallStats) return;

    let _visibleFieldsCount = 0;
    const _totalFieldsCount = totalFields ?? 0;

    if (showEmptyFields === true) {
      _visibleFieldsCount = _totalFieldsCount;
    } else {
      _visibleFieldsCount =
        overallStats.aggregatableExistsFields.length +
        overallStats.nonAggregatableExistsFields.length;
    }
    return { visibleFieldsCount: _visibleFieldsCount, totalFieldsCount: _totalFieldsCount };
  }, [overallStats, showEmptyFields, totalFields]);

  useEffect(
    () => {
      createMetricCards();
      createNonMetricCards();
    }, // eslint-disable-next-line react-hooks/exhaustive-deps
    [overallStats, showEmptyFields]
  );

  const configs = useMemo(
    () => {
      let combinedConfigs = [...nonMetricConfigs, ...metricConfigs];

      combinedConfigs = filterFields(
        combinedConfigs,
        visibleFieldNames,
        visibleFieldTypes
      ).filteredFields;

      const examples = exampleDocs?.reduce((map, exampleDoc) => {
        map.set(exampleDoc.fieldName, exampleDoc);
        return map;
      }, new Map());

      if (fieldStatsProgress.loaded === 100 && fieldStats) {
        combinedConfigs = combinedConfigs.map((c) => {
          const loadedFullStats = fieldStats.get(c.fieldName) ?? examples?.get(c.fieldName) ?? {};
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
    }, // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      nonMetricConfigs,
      metricConfigs,
      visibleFieldTypes,
      visibleFieldNames,
      fieldStatsProgress.loaded,
      dataVisualizerListState.pageIndex,
      dataVisualizerListState.pageSize,
      exampleDocs,
    ]
  );

  const getItemIdToExpandedRowMap = useCallback(
    function (itemIds: string[], items: FieldVisConfig[]): ItemIdToExpandedRowMap {
      return itemIds.reduce((map: ItemIdToExpandedRowMap, fieldName: string) => {
        const item = items.find((fieldVisConfig) => fieldVisConfig.fieldName === fieldName);
        if (item !== undefined) {
          map[fieldName] = (
            <IndexBasedDataVisualizerExpandedRow
              item={item}
              dataView={currentDataView}
              esql={query.esql}
              totalDocuments={totalCount}
              typeAccessor="secondaryType"
              timeFieldName={timeFieldName}
              onAddFilter={input.onAddFilter}
            />
          );
        }
        return map;
      }, {} as ItemIdToExpandedRowMap);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentDataView, totalCount, query.esql, timeFieldName]
  );

  const combinedProgress = useMemo(
    () =>
      totalCount === 0
        ? overallStatsProgress.loaded
        : overallStatsProgress.loaded * 0.3 + fieldStatsProgress.loaded * 0.7,
    [totalCount, overallStatsProgress.loaded, fieldStatsProgress.loaded]
  );

  const resetData = useCallback(
    (q?: AggregateQuery) => {
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
    },
    [cancelFieldStatsRequest, cancelOverallStatsRequest]
  );

  useEffect(() => {
    if (previousQuery?.esql !== input?.esqlQuery?.esql) {
      resetData();
      setDelayedESQLQuery(input?.esqlQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input?.esqlQuery?.esql, resetData]);

  return {
    totalCount,
    progress: combinedProgress,
    overallStatsProgress,
    configs,
    // Column with action to lens, data view editor, etc
    // set to nothing for now
    extendedColumns: undefined,
    documentCountStats,
    metricsStats,
    overallStats,
    timefilter,
    setLastRefresh,
    getItemIdToExpandedRowMap,
    cancelOverallStatsRequest,
    cancelFieldStatsRequest,
    resetData,
    limitSize,
    showEmptyFields,
    fieldsCountStats,
    timeFieldName,
    queryHistoryStatus,
  };
};
