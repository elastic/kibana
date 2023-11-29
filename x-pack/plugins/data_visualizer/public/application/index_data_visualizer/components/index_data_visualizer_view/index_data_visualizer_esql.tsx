/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React, { FC, useEffect, useMemo, useState, useCallback, useRef, useReducer } from 'react';
import type { Required } from 'utility-types';
import { mlTimefilterRefresh$, useTimefilter } from '@kbn/ml-date-picker';
import { TextBasedLangEditor } from '@kbn/text-based-languages/public';
import { AggregateQuery } from '@kbn/es-query';
import { from, Subscription, Observable, lastValueFrom } from 'rxjs';
import { useTrackedPromise } from '@kbn/use-tracked-promise';

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

// import { type Filter, FilterStateStore, type Query } from '@kbn/es-query';
// import { generateFilters } from '@kbn/data-plugin/public';
// import { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import { usePageUrlState, useUrlState } from '@kbn/ml-url-state';
import {
  DatePickerWrapper,
  // FullTimeRangeSelector,
  FROZEN_TIER_PREFERENCE,
} from '@kbn/ml-date-picker';
import { useStorage } from '@kbn/ml-local-storage';

import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import { SEARCH_QUERY_LANGUAGE, type SearchQueryLanguage } from '@kbn/ml-query-utils';
import { getIndexPatternFromSQLQuery, getIndexPatternFromESQLQuery } from '@kbn/es-query';
import { DataView } from '@kbn/data-views-plugin/common';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';
import { OMIT_FIELDS } from '@kbn/ml-anomaly-utils';
import { ES_FIELD_TYPES, KBN_FIELD_TYPES } from '@kbn/field-types';
import { search } from '@kbn/content-management-plugin/server/rpc/procedures/search';
import { aggAvg } from '@kbn/data-plugin/common';
import { SupportedFieldType } from '../../../../../common/types';
import { TimeBucketsInterval } from '../../../../../common/services/time_buckets';
import type {
  DataStatsFetchProgress,
  FieldStats,
  FieldStatsCommonRequestParams,
  OverallStatsSearchStrategyParams,
  StringFieldStats,
} from '../../../../../common/types/field_stats';
import { getInitialProgress, getReducer } from '../../progress_utils';
// import { kbnTypeToSupportedType } from '../../../common/util/field_types_utils';
import { useCurrentEuiTheme } from '../../../common/hooks/use_current_eui_theme';
import {
  DV_FROZEN_TIER_PREFERENCE,
  // DV_RANDOM_SAMPLER_PREFERENCE,
  // DV_RANDOM_SAMPLER_P_VALUE,
  type DVKey,
  type DVStorageMapped,
} from '../../types/storage';
// import {
//   DataVisualizerTable,
//   ItemIdToExpandedRowMap,
// } from '../../../common/components/stats_table';
import { FieldVisConfig } from '../../../common/components/stats_table/types';
// import type { TotalFieldsStats } from '../../../common/components/stats_table/components/field_count_stats';
import type { NonAggregatableField, OverallStats } from '../../types/overall_stats';
// import { IndexBasedDataVisualizerExpandedRow } from '../../../common/components/expanded_row/index_based_expanded_row';
import { DATA_VISUALIZER_INDEX_VIEWER } from '../../constants/index_data_visualizer_viewer';
import {
  DataVisualizerIndexBasedAppState,
  DataVisualizerIndexBasedPageUrlState,
} from '../../types/index_data_visualizer_state';
import { useDataVisualizerKibana } from '../../../kibana_context';
// import { FieldCountPanel } from '../../../common/components/field_count_panel';
// import { DocumentCountContent } from '../../../common/components/document_count_content';
// import { OMIT_FIELDS } from '../../../../../common/constants';
// import { SearchPanel } from '../search_panel';
// import { ActionsPanel } from '../actions_panel';
// import { createMergedEsQuery } from '../../utils/saved_search_utils';
// import { DataVisualizerDataViewManagement } from '../data_view_management';
import { GetAdditionalLinks } from '../../../common/components/results_links';
// import { useDataVisualizerGridData } from '../../hooks/use_data_visualizer_grid_data';
// import { DataVisualizerGridInput } from '../../embeddables/grid_embeddable/grid_embeddable';
import {
  // MIN_SAMPLER_PROBABILITY,
  RANDOM_SAMPLER_OPTION,
  // RandomSamplerOption,
} from '../../constants/random_sampler';
import { getESQLDocumentCountStats } from '../../search_strategy/requests/get_document_stats';
import { DocumentCountContent } from '../../../common/components/document_count_content';
import { getESQLSupportedAggs, getSupportedAggs } from '../../utils/get_supported_aggs';
import { useTimeBuckets } from '../../../common/hooks/use_time_buckets';
import {
  DataVisualizerTable,
  ItemIdToExpandedRowMap,
} from '../../../common/components/stats_table';
import { getSupportedFieldType } from '../../../common/components/fields_stats_grid/get_field_names';
import { MetricFieldsStats } from '../../../common/components/stats_table/components/field_count_stats';
import { filterFields } from '../../../common/components/fields_stats_grid/filter_fields';
import { kbnTypeToSupportedType } from '../../../common/util/field_types_utils';
import { isESQLQuery } from '../../search_strategy/requests/esql_utils';
import { useCancellableSearch } from '../../hooks/use_cancellable_hooks';
import { MAX_PERCENT, PERCENTILE_SPACING } from '../../search_strategy/requests/constants';
import { processDistributionData } from '../../utils/process_distribution_data';
import { IndexBasedDataVisualizerExpandedRow } from '../../../common/components/expanded_row/index_based_expanded_row';

const NON_AGGREGATABLE_FIELD_TYPES = new Set<string>([
  KBN_FIELD_TYPES.GEO_SHAPE,
  KBN_FIELD_TYPES.GEO_POINT,
  KBN_FIELD_TYPES.HISTOGRAM,
]);

export async function getDataViewByIndexPattern(
  dataViews: DataViewsContract,
  indexPatternFromQuery: string | undefined,
  currentDataView: DataView | undefined
) {
  if (
    indexPatternFromQuery &&
    (currentDataView?.isPersisted() || indexPatternFromQuery !== currentDataView?.getIndexPattern())
  ) {
    const dataViewObj = await dataViews.create({
      title: indexPatternFromQuery,
    });

    if (dataViewObj.fields.getByName('@timestamp')?.type === 'date') {
      dataViewObj.timeFieldName = '@timestamp';
    }
    return dataViewObj;
  }
  return currentDataView;
}

interface Column {
  type: string;
  name: string;
  secondaryType: string;
}

interface AggregatableField {
  fieldName: string;
  existsInDocs: boolean;
  stats?: {
    sampleCount: number;
    count: number;
    cardinality: number;
  };
}
interface Data {
  timeFieldName?: string;
  columns?: Column[];
  totalCount?: number;
  nonAggregatableFields?: Array<{ name: string; type: string }>;
  aggregatableFields?: Array<{ name: string; type: string; supportedAggs: Set<string> }>;
  documentCountStats?: FieldVisConfig;
  overallStats?: {
    aggregatableExistsFields: AggregatableField[];
    aggregatableNotExistsFields: AggregatableField[];
    nonAggregatableExistsFields: NonAggregatableField[];
    nonAggregatableNotExistsFields: NonAggregatableField[];
  };
}
export const getInitialData = (): Data => ({
  timeFieldName: undefined,
  columns: undefined,
  totalCount: undefined,
});

const defaults = getDefaultPageState();

const PERCENTS = Array.from(
  Array(MAX_PERCENT / PERCENTILE_SPACING + 1),
  (_, i) => i * PERCENTILE_SPACING
);

const getPercentileESQLQuery = (fieldName: string) =>
  PERCENTS.map((p) => `${fieldName}_p${p} = PERCENTILE(${fieldName}, ${p})`);

export const useESQLFieldStatsData = ({
  searchQuery,
  columns,
}: {
  searchQuery?: AggregateQuery;
  columns?: Column[];
}) => {
  const [fieldStats, setFieldStats] = useState<Map<string, FieldStats>>();

  const [fetchState, setFetchState] = useReducer(
    getReducer<DataStatsFetchProgress>(),
    getInitialProgress()
  );

  const { runRequest, cancelRequest } = useCancellableSearch();

  useEffect(
    function updateFieldStats() {
      let unmounted = false;

      const fetchFieldStats = async () => {
        if (!isESQLQuery(searchQuery) || !columns) return;

        cancelRequest();
        setFetchState({
          ...getInitialProgress(),
          isRunning: true,
          error: undefined,
        });
        try {
          // GETTING STATS FOR NUMERIC FIELDS
          const esqlBaseQuery = searchQuery.esql;

          const numericFields = columns
            .filter((f) => f.secondaryType === 'number')
            .map((field, idx) => {
              const percentiles = getPercentileESQLQuery(field.name);
              // idx * 23 + 0
              /**
               * 0 = min; 23
               * 1 = max; 24
               * 2 p0; 25
               * 3 p5; 26
               * 4 p10
               * ...
               * 22 p100
               */
              return {
                field,
                query: `${field.name}_min = MIN(${field.name}),
              ${field.name}_max = MAX(${field.name}),
              ${percentiles.join(',')}
              `,
                startIndex: idx * (percentiles.length + 2),
              };
            });
          const fieldStatsQuery = '| STATS ' + numericFields.map(({ query }) => query).join(',');

          const fieldStatsResp = await runRequest(
            {
              params: {
                query: esqlBaseQuery + fieldStatsQuery,
                time_zone: 'UTC',
                locale: 'en',
                filter: {
                  bool: {
                    must: [],
                    filter: [],
                    should: [],
                    must_not: [],
                  },
                },
              },
            },
            { strategy: 'esql' }
          );

          if (!unmounted && fieldStatsResp) {
            const values = fieldStatsResp.rawResponse.values[0];

            const processedFieldStats = new Map<string, FieldStats>();
            numericFields.forEach(({ field, startIndex }, idx) => {
              const min = values[startIndex + 0];
              const max = values[startIndex + 1];
              const median = values[startIndex + 12];

              const percentiles = values
                .slice(startIndex + 2, startIndex + 23)
                .map((value) => ({ value }));

              const distribution = processDistributionData(percentiles, PERCENTILE_SPACING, min);

              processedFieldStats.set(field.name, {
                fieldName: field.name,
                ...field,
                min,
                max,
                median,
                distribution,
              });
            });

            setFieldStats(processedFieldStats);

            // GETTING STATS FOR KEYWORD FIELDS
            const keywordFields = columns
              .filter((f) => f.secondaryType === 'keyword')
              .map((field) => {
                return {
                  field,
                  query: `| STATS ${field.name}_terms = count(${field.name}) by ${field.name} | LIMIT 10`,
                };
              });

            const keywordTopTermsResp = await Promise.all(
              keywordFields.map(({ query }) =>
                runRequest(
                  {
                    params: {
                      query: esqlBaseQuery + query,
                      time_zone: 'UTC',
                      locale: 'en',
                      filter: {
                        bool: {
                          must: [],
                          filter: [],
                          should: [],
                          must_not: [],
                        },
                      },
                    },
                  },
                  { strategy: 'esql' }
                )
              )
            );
            if (keywordTopTermsResp) {
              keywordFields.forEach(({ field }, idx) => {
                const results = keywordTopTermsResp[idx].rawResponse.values;
                const topValuesSampleSize = results.reduce((acc, row) => acc + row[0], 0);

                const terms = results.map((row) => ({
                  key: row[1],
                  doc_count: row[0],
                  percent: row[0] / topValuesSampleSize,
                }));

                processedFieldStats.set(field.name, {
                  fieldName: field.name,
                  topValues: terms,
                  topValuesSampleSize,
                  // @TODO: replace topValuesSamplerShardSize
                  topValuesSamplerShardSize: topValuesSampleSize,
                  isTopValuesSampled: false,
                } as StringFieldStats);
              });
            }

            // GETTING STATS FOR BOOLEAN FIELDS
            const booleanFields = columns
              .filter((f) => f.secondaryType === 'boolean')
              .map((field) => {
                return {
                  field,
                  query: `| STATS ${field.name}_terms = count(${field.name}) by ${field.name} | LIMIT 3`,
                };
              });

            const booleanTopTermsResp = await Promise.all(
              booleanFields.map(({ query }) =>
                runRequest(
                  {
                    params: {
                      query: esqlBaseQuery + query,
                      time_zone: 'UTC',
                      locale: 'en',
                      filter: {
                        bool: {
                          must: [],
                          filter: [],
                          should: [],
                          must_not: [],
                        },
                      },
                    },
                  },
                  { strategy: 'esql' }
                )
              )
            );
            if (booleanTopTermsResp) {
              booleanFields.forEach(({ field }, idx) => {
                const results = booleanTopTermsResp[idx].rawResponse.values;
                const topValuesSampleSize = results.reduce((acc, row) => acc + row[0], 0);

                let falseCount = 0;
                let trueCount = 0;
                const terms = results.map((row) => {
                  if (row[1] === false) {
                    falseCount = row[0];
                  }
                  if (row[1] === true) {
                    trueCount = row[0];
                  }
                  return {
                    key_as_string: row[1].toString(),
                    doc_count: row[0],
                    percent: row[0] / topValuesSampleSize,
                  };
                });

                processedFieldStats.set(field.name, {
                  fieldName: field.name,
                  topValues: terms,
                  topValuesSampleSize,
                  // @TODO: replace topValuesSamplerShardSize
                  topValuesSamplerShardSize: topValuesSampleSize,
                  isTopValuesSampled: false,
                  trueCount,
                  falseCount,
                } as StringFieldStats);
              });
            }

            setFetchState({
              loaded: 100,
              isRunning: false,
            });
          }
        } catch (e) {
          setFetchState({
            loaded: 100,
            isRunning: false,
            error: e,
          });
        }
      };
      fetchFieldStats();

      return () => {
        unmounted = true;
      };
    },
    [cancelRequest, columns, runRequest, searchQuery]
  );

  return { fieldStats, fieldStatsProgress: fetchState };
};

export const useESQLDataVisualizerGridData = (fieldStatsRequest: {
  earliest: number | undefined;
  latest: number | undefined;
  aggInterval: TimeBucketsInterval;
  intervalMs: number;
  searchQuery: AggregateQuery;
  indexPattern: string | undefined;
  timeFieldName: string | undefined;
  aggregatableFields: string[];
  nonAggregatableFields: string[];
  fieldsToFetch: string[];
}) => {
  const {
    services: { data },
  } = useDataVisualizerKibana();
  const [fetchState, setFetchState] = useReducer(
    getReducer<DataStatsFetchProgress>(),
    getInitialProgress()
  );

  const [tableData, setTableData] = useReducer(getReducer<Data>(), getInitialData());
  const [overallStatsProgress, setOverallStatsProgress] = useReducer(
    getReducer<DataStatsFetchProgress>(),
    getInitialProgress()
  );

  const [lastRefresh, setLastRefresh] = useState(0);

  const abortCtrl = useRef(new AbortController());

  const searchSubscription$ = useRef<Subscription>();

  const startFetch = useCallback(async () => {
    try {
      searchSubscription$.current?.unsubscribe();
      abortCtrl.current.abort();
      abortCtrl.current = new AbortController();

      setFetchState({
        ...getInitialProgress(),
        isRunning: true,
        error: undefined,
      });

      if (!fieldStatsRequest) {
        return;
      }

      const { searchQuery, intervalMs } = fieldStatsRequest;

      const searchOptions = {
        abortSignal: abortCtrl.current.signal,
        // sessionId,
        // ...(embeddableExecutionContext ? { executionContext: embeddableExecutionContext } : {}),
      };

      if (!isESQLQuery(searchQuery)) {
        return;
      }

      const intervalInMs = intervalMs === 0 ? 60 * 60 * 60 * 10 : intervalMs;
      const esqlBaseQuery = searchQuery.esql;

      // @TODO: potentially change the limit of this one to get sampled top values
      const columnsResp = await lastValueFrom(
        data.search.search(
          {
            params: {
              query: esqlBaseQuery + '| LIMIT 0',
              time_zone: 'UTC',
              locale: 'en',
              filter: {
                bool: {
                  must: [],
                  filter: [],
                  should: [],
                  must_not: [],
                },
              },
            },
          },
          { ...searchOptions, strategy: 'esql' }
        )
      );

      const columns = columnsResp.rawResponse.columns.map((c) => ({
        ...c,
        secondaryType: getSupportedFieldType(c.type),
      })) as Column[];

      const timeFields = columns.filter((d) => d.type === 'date');
      // If a date field '@timestamp' exists, set that as default time field, else set the first date field as default
      const timeFieldName =
        timeFields.length > 0
          ? timeFields.find((f) => f.name === '@timestamp')
            ? '@timestamp'
            : timeFields[0].name
          : undefined;

      setTableData({ columns, timeFieldName });

      const { totalCount, documentCountStats } = await getESQLDocumentCountStats(
        data.search,
        searchQuery,
        timeFieldName,
        intervalInMs,
        searchOptions
      );
      setTableData({ totalCount, documentCountStats });
      setOverallStatsProgress({
        ...getInitialProgress(),
        isRunning: true,
        error: undefined,
      });
      const aggregatableFields: Array<{ name: string; type: string; supportedAggs: Set<string> }> =
        [];
      const nonAggregatableFields: Array<{ name: string; type: string }> = [];

      // @TODO: swap type and secondary type
      const fields = columns
        .filter((c) => c.type !== 'unsupported')
        .map((field) => {
          return { ...field, aggregatable: !NON_AGGREGATABLE_FIELD_TYPES.has(field.type) };
        });

      // @TODO: Update fields to fetch to reflect pagination & visible field types/names only
      const fieldsToFetch = fields;
      fields?.forEach((field) => {
        // @TODO: renable
        // if (fieldsToFetch && !fieldsToFetch.includes(field.name)) {
        //   return;
        // }
        const fieldName = field.name;
        if (!OMIT_FIELDS.includes(fieldName)) {
          if (!field.aggregatable) {
            nonAggregatableFields.push({
              ...field,
              fieldName: field.name,
              secondaryType: getSupportedFieldType(field.type),
            });
          } else {
            aggregatableFields.push({
              ...field,
              fieldName: field.name,
              secondaryType: getSupportedFieldType(field.type),
              supportedAggs: getESQLSupportedAggs(field, true),
              aggregatable: true,
            });
          }
        }
      });
      // COUNT + CARDINALITY
      setTableData({ aggregatableFields, nonAggregatableFields });

      if (fields.length > 0) {
        const aggregatableFieldsToQuery = fields.filter((f) => f.aggregatable);
        let countQuery = '| STATS ';
        countQuery += aggregatableFieldsToQuery
          .map((field) => {
            return `${field.name}_count = count(${field.name}), ${field.name}_cardinality = count_distinct(${field.name})`;
          })
          .join(',');

        const esqlResults = await lastValueFrom(
          data.search.search(
            {
              params: {
                query: searchQuery.esql + countQuery,
                time_zone: 'UTC',
                locale: 'en',
              },
            },
            { strategy: 'esql' }
          )
        );

        const stats = {
          aggregatableExistsFields: [],
          aggregatableNotExistsFields: [],
          nonAggregatableExistsFields: [] as NonAggregatableField[],
          nonAggregatableNotExistsFields: [] as NonAggregatableField[],
        };

        aggregatableFieldsToQuery.forEach((field, idx) => {
          const count = esqlResults.rawResponse.values[0][idx * 2];
          const cardinality = esqlResults.rawResponse.values[0][idx * 2 + 1];

          if (field.aggregatable === true) {
            if (count > 0) {
              stats.aggregatableExistsFields.push({
                ...field,
                fieldName: field.name,
                existsInDocs: true,
                stats: {
                  sampleCount: totalCount,
                  count,
                  cardinality,
                },
              });
            } else {
              stats.aggregatableNotExistsFields.push({
                ...field,
                fieldName: field.name,
                existsInDocs: false,
                stats: {},
              });
            }
          } else {
            const fieldData = {
              fieldName: field.name,
              existsInDocs: true,
            };
            if (count > 0) {
              stats.nonAggregatableExistsFields.push(fieldData);
            } else {
              stats.nonAggregatableNotExistsFields.push(fieldData);
            }
          }
        });

        setTableData({ overallStats: stats });
        setOverallStatsProgress({
          loaded: 100,
          isRunning: false,
          error: undefined,
        });
      }
    } catch (error) {
      console.error(error);
    }
  }, [data.search, JSON.stringify({ fieldStatsRequest, lastRefresh })]);

  // auto-update
  useEffect(() => {
    startFetch();
  }, [startFetch]);

  return useMemo(() => ({ ...tableData, overallStatsProgress }), [tableData, overallStatsProgress]);
};

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
  const { services } = useDataVisualizerKibana();
  const { uiSettings, data } = services;
  const euiTheme = useCurrentEuiTheme();

  const [query, setQuery] = useState<AggregateQuery>({ esql: '' });
  const [currentDataView, setCurrentDataView] = useState<DataView | undefined>();

  const _timeBuckets = useTimeBuckets();
  const timefilter = useTimefilter({
    timeRangeSelector: currentDataView?.timeFieldName !== undefined,
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

  useEffect(
    function updateAdhocDataViewFromQuery() {
      let unmounted = false;

      const update = async () => {
        const dv = await getDataViewByIndexPattern(data.dataViews, indexPattern, currentDataView);
        if (dv) {
          setCurrentDataView(dv);
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
  const fieldStatsRequest = useMemo(
    () => {
      // Obtain the interval to use for date histogram aggregations
      // (such as the document count chart). Aim for 75 bars.
      const buckets = _timeBuckets;

      const tf = timefilter;

      if (!buckets || !tf || !currentDataView) return;
      const activeBounds = tf.getActiveBounds();

      let earliest: number | undefined;
      let latest: number | undefined;
      if (activeBounds !== undefined && currentDataView.timeFieldName !== undefined) {
        earliest = activeBounds.min?.valueOf();
        latest = activeBounds.max?.valueOf();
      }

      const bounds = tf.getActiveBounds();
      const BAR_TARGET = 75;
      buckets.setInterval('auto');

      if (bounds) {
        buckets.setBounds(bounds);
        buckets.setBarTarget(BAR_TARGET);
      }

      const aggInterval = buckets.getInterval();

      return {
        earliest,
        latest,
        aggInterval,
        intervalMs: aggInterval?.asMilliseconds(),
        searchQuery: query,
        samplerShardSize: undefined,
        sessionId: undefined,
        indexPattern,
        timeFieldName: currentDataView.timeFieldName,
        runtimeFieldMap: currentDataView.getRuntimeMappings(),
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      _timeBuckets,
      timefilter,
      currentDataView?.id,
      // eslint-disable-next-line react-hooks/exhaustive-deps
      JSON.stringify(query),
      indexPattern,
    ]
  );

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

  const {
    documentCountStats,
    totalCount,
    aggregatableFields,
    nonAggregatableFields,
    overallStats,
    overallStatsProgress,
    columns,
  } = useESQLDataVisualizerGridData(fieldStatsRequest);

  const { fieldStats, fieldStatsProgress } = useESQLFieldStatsData({
    searchQuery: fieldStatsRequest?.searchQuery,
    columns,
  });
  const [metricConfigs, setMetricConfigs] = useState(defaults.metricConfigs);
  const [metricsLoaded, setMetricsLoaded] = useState(defaults.metricsLoaded);
  const [metricsStats, setMetricsStats] = useState<undefined | MetricFieldsStats>();

  const [nonMetricConfigs, setNonMetricConfigs] = useState(defaults.nonMetricConfigs);
  const [nonMetricsLoaded, setNonMetricsLoaded] = useState(defaults.nonMetricsLoaded);

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

    // @todo: re-enable
    // if (metricsLoaded === false) {
    //   setMetricsLoaded(true);
    //   return;
    // }

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
        // fieldFormat: currentDataView.getFormatterForField(field),
        loading: fieldData?.existsInDocs ?? true,
        aggregatable: true,
        deletable: false,
        supportedAggs: getSupportedAggs(field),
      };
      // if (field.displayName !== metricConfig.fieldName) {
      //   metricConfig.displayName = field.displayName;
      // }

      configs.push(metricConfig);
    });

    setMetricsStats({
      totalMetricFieldsCount: allMetricFields.length,
      visibleMetricsCount: metricFieldsToShow.length,
    });
    setMetricConfigs(configs);
  }, [metricsLoaded, overallStats, showEmptyFields, columns]);

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

    // @todo  re-enable
    // if (nonMetricsLoaded === false) {
    //   setNonMetricsLoaded(true);
    //   return;
    // }

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
        secondaryType: kbnTypeToSupportedType(field),
        // fieldFormat: currentDataView.getFormatterForField(field),
        aggregatable: fieldData.aggregatable,
        loading: fieldData?.existsInDocs ?? true,
        deletable: false,
      };

      // Map the field type from the Kibana index pattern to the field type
      // used in the data visualizer.
      const dataVisualizerType = kbnTypeToSupportedType(field) as SupportedFieldType;
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
  }, [columns, nonMetricsLoaded, overallStats, showEmptyFields]);

  useEffect(() => {
    createMetricCards();
    createNonMetricCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overallStats, showEmptyFields]);

  const configs = useMemo(
    () => {
      let combinedConfigs = [...nonMetricConfigs, ...metricConfigs];

      combinedConfigs = filterFields(
        combinedConfigs,
        visibleFieldNames,
        visibleFieldTypes
      ).filteredFields;

      // @todo: renable
      if (fieldStatsProgress.loaded === 100 && fieldStats) {
        combinedConfigs = combinedConfigs.map((c) => {
          const loadedFullStats = fieldStats.get(c.name) ?? {};

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
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      nonMetricConfigs,
      metricConfigs,
      visibleFieldTypes,
      visibleFieldNames,
      fieldStatsProgress.loaded,
      dataVisualizerListState.pageIndex,
      dataVisualizerListState.pageSize,
    ]
  );

  // @TODO: remove
  // const configs = useMemo(() => {
  //   return [...(aggregatableFields ?? []), ...(nonAggregatableFields ?? [])];
  // }, [aggregatableFields, nonAggregatableFields]);

  // const configsWithoutStats = useMemo(() => {
  //   if (overallStatsProgress.loaded < 100) return;
  //   const existMetricFields = metricConfigs
  //     .map((config) => {
  //       return {
  //         ...config,
  //         cardinality: config.stats?.cardinality,
  //       };
  //     })
  //     .filter((c) => c !== undefined) as FieldRequestConfig[];

  //   // Pass the field name, type and cardinality in the request.
  //   // Top values will be obtained on a sample if cardinality > 100000.
  //   const existNonMetricFields: FieldRequestConfig[] = nonMetricConfigs
  //     .map((config) => {
  //       return {
  //         ...config,
  //         cardinality: config.stats?.cardinality,
  //       };
  //     })
  //     .filter((c) => c !== undefined) as FieldRequestConfig[];

  //   return { metricConfigs: existMetricFields, nonMetricConfigs: existNonMetricFields };
  // }, [aggregatableFields, nonAggregatableFields, overallStatsProgress.loaded]);

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
              onAddFilter={() => {}}
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
              <DatePickerWrapper isAutoRefreshOnly={false} showRefresh={false} width="full" />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPageTemplate.Header>
        <EuiSpacer size="m" />

        <EuiFlexGroup gutterSize="m" direction={isWithinLargeBreakpoint ? 'column' : 'row'}>
          <EuiFlexItem>
            <EuiPanel hasShadow={false} hasBorder grow={false}>
              <EuiFlexItem>
                <TextBasedLangEditor
                  query={query}
                  onTextLangQueryChange={(q: AggregateQuery) => {
                    setQuery(q);
                    // setParam('esqlQuery', q);
                    // refreshTimeFields(q);
                  }}
                  expandCodeEditor={() => false}
                  isCodeEditorExpanded={true}
                  onTextLangQuerySubmit={() => {}}
                  detectTimestamp={true}
                  hideMinimizeButton={true}
                  hideRunQueryText={true}
                />
              </EuiFlexItem>

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

              {totalCount !== undefined && (
                <>
                  <EuiSpacer size="m" />
                  <EuiFlexGroup gutterSize="s" direction="column">
                    <DocumentCountContent
                      documentCountStats={documentCountStats}
                      totalCount={totalCount}
                      // setSamplingProbability={setSamplingProbability}
                      samplingProbability={1}
                      loading={false}
                      // randomSamplerPreference={savedRandomSamplerPreference}
                      // setRandomSamplerPreference={setRandomSamplerPreference}
                    />
                  </EuiFlexGroup>
                </>
              )}
              <EuiSpacer size="m" />
              {/* <FieldCountPanel
                showEmptyFields={showEmptyFields}
                toggleShowEmptyFields={toggleShowEmptyFields}
                fieldsCountStats={fieldsCountStats}
                metricsStats={metricsStats}
              /> */}
              <EuiSpacer size="m" />
              <EuiProgress value={50} max={100} size="xs" />
              <DataVisualizerTable<FieldVisConfig>
                items={configs}
                pageState={dataVisualizerListState}
                updatePageState={setDataVisualizerListState}
                getItemIdToExpandedRowMap={getItemIdToExpandedRowMap}
                // extendedColumns={extendedColumns}
                // loading={progress < 100}
                overallStatsRunning={overallStatsProgress.isRunning}
                showPreviewByDefault={dataVisualizerListState.showDistributions ?? true}
                onChange={setDataVisualizerListState}
                totalCount={totalCount}
              />
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
