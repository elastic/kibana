/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESQL_SEARCH_STRATEGY, KBN_FIELD_TYPES } from '@kbn/data-plugin/common';
import type { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';
import type { AggregateQuery } from '@kbn/es-query';
import type { ESQLSearchReponse } from '@kbn/es-types';
import { i18n } from '@kbn/i18n';
import { isDefined } from '@kbn/ml-is-defined';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { lastValueFrom, Subscription } from 'rxjs';
import { chunk } from 'lodash';
import { OMIT_FIELDS } from '../../../../common/constants';
import type { TimeBucketsInterval } from '../../../../common/services/time_buckets';
import type {
  DataStatsFetchProgress,
  DateFieldStats,
  FieldExamples,
  FieldStats,
  StringFieldStats,
} from '../../../../common/types/field_stats';
import { getSupportedFieldType } from '../../common/components/fields_stats_grid/get_field_names';
import type { DocumentCountStats } from '../../common/hooks/use_document_count_stats';
import { useDataVisualizerKibana } from '../../kibana_context';
import { getInitialProgress, getReducer } from '../progress_utils';
import { PERCENTILE_SPACING } from '../search_strategy/requests/constants';
import {
  escapeESQL,
  getESQLPercentileQueryArray,
  isESQLQuery,
} from '../search_strategy/requests/esql_utils';
import { getESQLDocumentCountStats } from '../search_strategy/requests/get_document_stats';
import type { NonAggregatableField } from '../types/overall_stats';
import { getESQLSupportedAggs } from '../utils/get_supported_aggs';
import { processDistributionData } from '../utils/process_distribution_data';
import { useCancellableSearch } from './use_cancellable_hooks';

export interface AggregatableField {
  fieldName: string;
  existsInDocs: boolean;
  stats?: {
    sampleCount: number;
    count: number;
    cardinality: number;
  };
  aggregatable?: boolean;
}
interface Data {
  timeFieldName?: string;
  columns?: Column[];
  totalCount?: number;
  nonAggregatableFields?: Array<{ name: string; type: string }>;
  aggregatableFields?: Array<{ name: string; type: string; supportedAggs: Set<string> }>;
  documentCountStats?: DocumentCountStats;
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

const NON_AGGREGATABLE_FIELD_TYPES = new Set<string>([
  KBN_FIELD_TYPES.GEO_SHAPE,
  KBN_FIELD_TYPES.GEO_POINT,
  KBN_FIELD_TYPES.HISTOGRAM,
]);

export interface Column {
  type: string;
  name: string;
  secondaryType: string;
}

type BucketCount = number;
type BucketTerm = string;

export const useESQLFieldStatsData = <T extends Column>({
  searchQuery,
  columns: allColumns,
  filter,
}: {
  searchQuery?: AggregateQuery;
  columns?: T[];
  filter?: QueryDslQueryContainer;
}) => {
  const [fieldStats, setFieldStats] = useState<Map<string, FieldStats>>();

  const [fetchState, setFetchState] = useReducer(
    getReducer<DataStatsFetchProgress>(),
    getInitialProgress()
  );

  const { runRequest, cancelRequest } = useCancellableSearch();

  const {
    services: {
      notifications: { toasts },
    },
  } = useDataVisualizerKibana();

  useEffect(
    function updateFieldStats() {
      let unmounted = false;

      const fetchFieldStats = async () => {
        cancelRequest();

        if (!isESQLQuery(searchQuery) || !allColumns) return;

        setFetchState({
          ...getInitialProgress(),
          isRunning: true,
          error: undefined,
        });
        try {
          const esqlBaseQuery = searchQuery.esql;
          const totalFieldsCnt = allColumns.length;
          const processedFieldStats = new Map<string, FieldStats>();

          setFieldStats(processedFieldStats);

          // GETTING STATS FOR NUMERIC FIELDS

          const aggregatableFieldsChunks = chunk(allColumns, 30);

          for (const columns of aggregatableFieldsChunks) {
            const numericFields = columns
              .filter((f) => f.secondaryType === 'number')
              .map((field, idx) => {
                const percentiles = getESQLPercentileQueryArray(field.name);
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
                  query: `${escapeESQL(`${field.name}_min`)} = MIN(${escapeESQL(field.name)}),
                ${escapeESQL(`${field.name}_max`)} = MAX(${escapeESQL(field.name)}),
              ${percentiles.join(',')}
              `,
                  startIndex: idx * (percentiles.length + 2),
                };
              });

            if (numericFields.length > 0) {
              const numericStatsQuery =
                '| STATS ' + numericFields.map(({ query }) => query).join(',');

              const fieldStatsResp = await runRequest(
                {
                  params: {
                    query: esqlBaseQuery + numericStatsQuery,
                    ...(filter ? { filter } : {}),
                  },
                },
                { strategy: ESQL_SEARCH_STRATEGY }
              );

              if (fieldStatsResp && !unmounted) {
                const values = fieldStatsResp.rawResponse.values[0];

                numericFields.forEach(({ field, startIndex }, idx) => {
                  const min = values[startIndex + 0];
                  const max = values[startIndex + 1];
                  const median = values[startIndex + 12];

                  const percentiles = values
                    .slice(startIndex + 2, startIndex + 23)
                    .map((value: number) => ({ value }));

                  const distribution = processDistributionData(
                    percentiles,
                    PERCENTILE_SPACING,
                    min
                  );

                  processedFieldStats.set(field.name, {
                    fieldName: field.name,
                    ...field,
                    min,
                    max,
                    median,
                    distribution,
                  });
                });

                setFetchState({
                  loaded: (processedFieldStats.size / totalFieldsCnt) * 100,
                });
              }
            }

            // GETTING STATS FOR KEYWORD FIELDS
            const keywordFields = columns
              .filter((f) => f.secondaryType === 'keyword' || f.secondaryType === 'ip')
              .map((field) => {
                return {
                  field,
                  query: `| STATS ${escapeESQL(`${field.name}_terms`)} = count(${escapeESQL(
                    field.name
                  )}) BY ${escapeESQL(field.name)}
                  | LIMIT 10
                  | SORT ${escapeESQL(`${field.name}_terms`)} DESC`,
                };
              });

            if (keywordFields.length > 0) {
              const keywordTopTermsResp = await Promise.all(
                keywordFields.map(({ query }) =>
                  runRequest(
                    {
                      params: {
                        query: esqlBaseQuery + query,
                        ...(filter ? { filter } : {}),
                      },
                    },
                    { strategy: ESQL_SEARCH_STRATEGY }
                  )
                )
              );
              if (keywordTopTermsResp && !unmounted) {
                keywordFields.forEach(({ field }, idx) => {
                  const resp = keywordTopTermsResp[idx];
                  if (isDefined(resp)) {
                    const results = resp.rawResponse.values as Array<[BucketCount, BucketTerm]>;
                    const topValuesSampleSize = results.reduce(
                      (acc: number, row) => acc + row[0],
                      0
                    );

                    const terms = results.map((row) => ({
                      key: row[1],
                      doc_count: row[0],
                      percent: row[0] / topValuesSampleSize,
                    }));

                    processedFieldStats.set(field.name, {
                      fieldName: field.name,
                      topValues: terms,
                      topValuesSampleSize,
                      topValuesSamplerShardSize: topValuesSampleSize,
                      isTopValuesSampled: false,
                    } as StringFieldStats);
                  }
                });
              }

              setFetchState({
                loaded: (processedFieldStats.size / totalFieldsCnt) * 100,
              });
            }

            // GETTING STATS FOR BOOLEAN FIELDS
            const booleanFields = columns
              .filter((f) => f.secondaryType === 'boolean')
              .map((field) => {
                return {
                  field,
                  query: `| STATS ${escapeESQL(`${field.name}_terms`)} = count(${escapeESQL(
                    field.name
                  )}) BY ${escapeESQL(field.name)}
                  | LIMIT 3`,
                };
              });
            if (booleanFields.length > 0) {
              const booleanTopTermsResp = await Promise.all(
                booleanFields.map(({ query }) =>
                  runRequest(
                    {
                      params: {
                        query: esqlBaseQuery + query,
                        ...(filter ? { filter } : {}),
                      },
                    },
                    { strategy: ESQL_SEARCH_STRATEGY }
                  )
                )
              );
              if (booleanTopTermsResp && !unmounted) {
                booleanFields.forEach(({ field }, idx) => {
                  const resp = booleanTopTermsResp[idx];
                  if (isDefined(resp)) {
                    const results = resp.rawResponse.values as Array<[BucketCount, boolean]>;
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
                        key_as_string: row[1]?.toString(),
                        doc_count: row[0],
                        percent: row[0] / topValuesSampleSize,
                      };
                    });

                    processedFieldStats.set(field.name, {
                      fieldName: field.name,
                      topValues: terms,
                      topValuesSampleSize,
                      topValuesSamplerShardSize: topValuesSampleSize,
                      isTopValuesSampled: false,
                      trueCount,
                      falseCount,
                    } as StringFieldStats);
                  }
                });
                setFetchState({
                  loaded: (processedFieldStats.size / totalFieldsCnt) * 100,
                });
              }
            }

            const textFields = columns.filter((f) => f.secondaryType === 'text');

            if (textFields.length > 0) {
              const textFieldsResp = await runRequest(
                {
                  params: {
                    query:
                      esqlBaseQuery +
                      `| KEEP ${textFields.map((f) => f.name).join(',')}
                     | LIMIT 10`,
                    ...(filter ? { filter } : {}),
                  },
                },
                { strategy: ESQL_SEARCH_STRATEGY }
              );

              if (textFieldsResp && !unmounted) {
                textFields.forEach((textField, idx) => {
                  const examples = (textFieldsResp.rawResponse.values as unknown[][]).map(
                    (row) => row[idx]
                  );

                  processedFieldStats.set(textField.name, {
                    fieldName: textField.name,
                    examples,
                  } as FieldExamples);
                });
                setFetchState({
                  loaded: (processedFieldStats.size / totalFieldsCnt) * 100,
                });
              }
            }

            // GETTING STATS FOR DATE FIELDS
            const dateFields = columns
              .filter((f) => f.secondaryType === 'date')
              .map((field) => {
                return {
                  field,
                  query: `${escapeESQL(`${field.name}_earliest`)} = MIN(${escapeESQL(
                    field.name
                  )}), ${escapeESQL(`${field.name}_latest`)} = MAX(${escapeESQL(field.name)})`,
                };
              });

            if (dateFields.length > 0) {
              const dateStatsQuery = ' | STATS ' + dateFields.map(({ query }) => query).join(',');

              const dateFieldsResp = await runRequest(
                {
                  params: {
                    query: esqlBaseQuery + dateStatsQuery,
                    ...(filter ? { filter } : {}),
                  },
                },
                { strategy: ESQL_SEARCH_STRATEGY }
              );

              if (dateFieldsResp && !unmounted) {
                dateFields.forEach(({ field: dateField }, idx) => {
                  const row = dateFieldsResp.rawResponse.values[0] as Array<null | string | number>;

                  const earliest = row[idx * 2];
                  const latest = row[idx * 2 + 1];

                  processedFieldStats.set(dateField.name, {
                    fieldName: dateField.name,
                    earliest,
                    latest,
                  } as DateFieldStats);
                });
                setFetchState({
                  loaded: (processedFieldStats.size / totalFieldsCnt) * 100,
                });
              }
            }
          }
          setFetchState({
            loaded: 100,
            isRunning: false,
          });
        } catch (e) {
          if (e.name !== 'AbortError') {
            const title = i18n.translate(
              'xpack.dataVisualizer.index.errorFetchingESQLFieldStatisticsMessage',
              {
                defaultMessage: 'Error fetching field statistics for ES|QL query',
              }
            );
            toasts.addError(e, {
              title,
            });

            // Log error to console for better debugging
            // eslint-disable-next-line no-console
            console.error(`${title}: fetchFieldStats`, e);
            setFetchState({
              loaded: 100,
              isRunning: false,
              error: e,
            });
          }
        }
      };
      fetchFieldStats();

      return () => {
        unmounted = true;
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allColumns, JSON.stringify({ filter })]
  );

  return { fieldStats, fieldStatsProgress: fetchState };
};

export const useESQLOverallStatsData = (
  fieldStatsRequest:
    | {
        earliest: number | undefined;
        latest: number | undefined;
        aggInterval: TimeBucketsInterval;
        intervalMs: number;
        searchQuery: AggregateQuery;
        indexPattern: string | undefined;
        timeFieldName: string | undefined;
        lastRefresh: number;
        filter?: QueryDslQueryContainer;
      }
    | undefined
) => {
  const {
    services: {
      data,
      notifications: { toasts },
    },
  } = useDataVisualizerKibana();

  const [tableData, setTableData] = useReducer(getReducer<Data>(), getInitialData());
  const [overallStatsProgress, setOverallStatsProgress] = useReducer(
    getReducer<DataStatsFetchProgress>(),
    getInitialProgress()
  );

  const abortCtrl = useRef(new AbortController());

  const searchSubscription$ = useRef<Subscription>();

  const startFetch = useCallback(
    async function fetchOverallStats() {
      try {
        searchSubscription$.current?.unsubscribe();
        abortCtrl.current.abort();
        abortCtrl.current = new AbortController();

        if (!fieldStatsRequest) {
          return;
        }
        setOverallStatsProgress({
          ...getInitialProgress(),
          isRunning: true,
          error: undefined,
        });
        setTableData({ totalCount: undefined, documentCountStats: undefined });

        const { searchQuery, intervalMs, filter } = fieldStatsRequest;

        const searchOptions = {
          abortSignal: abortCtrl.current.signal,
          // No sessionId here because ES|QL not yet supported (?)
        };

        if (!isESQLQuery(searchQuery)) {
          return;
        }

        const intervalInMs = intervalMs === 0 ? 60 * 60 * 60 * 10 : intervalMs;
        const esqlBaseQuery = searchQuery.esql;

        const columnsResp = await lastValueFrom(
          data.search.search(
            {
              params: {
                query: esqlBaseQuery + '| LIMIT 0',
                ...(filter ? { filter } : {}),
              },
            },
            { ...searchOptions, strategy: ESQL_SEARCH_STRATEGY }
          )
        );

        // @ts-expect-error ES types need to be updated with columns for ESQL queries
        const columns = columnsResp.rawResponse.columns.map((c) => ({
          ...c,
          secondaryType: getSupportedFieldType(c.type),
        })) as Column[];

        const timeFields = columns.filter((d) => d.type === 'date');

        const dataViewTimeField = timeFields.find(
          (f) => f.name === fieldStatsRequest?.timeFieldName
        )
          ? fieldStatsRequest?.timeFieldName
          : undefined;

        // If a date field named '@timestamp' exists, set that as default time field
        // Else, use the default time view defined by data view
        // Else, use first available date field as default
        const timeFieldName =
          timeFields.length > 0
            ? timeFields.find((f) => f.name === '@timestamp')
              ? '@timestamp'
              : dataViewTimeField ?? timeFields[0].name
            : undefined;

        setTableData({ columns, timeFieldName });

        const { totalCount, documentCountStats } = await getESQLDocumentCountStats(
          data.search,
          searchQuery,
          filter,
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
        const aggregatableFields: Array<{
          fieldName: string;
          name: string;
          type: string;
          supportedAggs: Set<string>;
          secondaryType: string;
          aggregatable: boolean;
        }> = [];
        const nonAggregatableFields: Array<{
          fieldName: string;
          name: string;
          type: string;
          secondaryType: string;
        }> = [];
        const fields = columns
          // Some field types are not supported by ESQL yet
          // Also, temporarily removing null columns because it causes problems with some aggs
          // See https://github.com/elastic/elasticsearch/issues/104430
          .filter((c) => c.type !== 'unsupported' && c.type !== 'null')
          .map((field) => {
            return { ...field, aggregatable: !NON_AGGREGATABLE_FIELD_TYPES.has(field.type) };
          });

        fields?.forEach((field) => {
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

          let countQuery = aggregatableFieldsToQuery.length > 0 ? '| STATS ' : '';
          countQuery += aggregatableFieldsToQuery
            .map((field) => {
              return `${escapeESQL(`${field.name}_count`)} = COUNT(${escapeESQL(
                field.name
              )}), ${escapeESQL(`${field.name}_cardinality`)} = COUNT_DISTINCT(${escapeESQL(
                field.name
              )})`;
            })
            .join(',');

          const esqlResults = await lastValueFrom(
            data.search.search(
              {
                params: {
                  query: searchQuery.esql + countQuery,
                  ...(filter ? { filter } : {}),
                },
              },
              { strategy: ESQL_SEARCH_STRATEGY }
            )
          );

          const stats = {
            aggregatableExistsFields: [] as AggregatableField[],
            aggregatableNotExistsFields: [] as AggregatableField[],
            nonAggregatableExistsFields: [] as NonAggregatableField[],
            nonAggregatableNotExistsFields: [] as NonAggregatableField[],
          };

          const esqlResultsResp = esqlResults.rawResponse as unknown as ESQLSearchReponse;

          aggregatableFieldsToQuery.forEach((field, idx) => {
            const count = esqlResultsResp.values[0][idx * 2] as number;
            const cardinality = esqlResultsResp.values[0][idx * 2 + 1] as number;

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
                  stats: undefined,
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
        if (error.name !== 'AbortError') {
          const title = i18n.translate(
            'xpack.dataVisualizer.index.errorFetchingESQLFieldStatisticsMessage',
            {
              defaultMessage: 'Error fetching field statistics for ES|QL query',
            }
          );
          toasts.addError(error, {
            title,
          });

          // Log error to console for better debugging
          // eslint-disable-next-line no-console
          console.error(`${title}: fetchOverallStats`, error);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.search, toasts, JSON.stringify({ fieldStatsRequest })]
  );

  // auto-update
  useEffect(() => {
    startFetch();
  }, [startFetch]);

  return useMemo(() => ({ ...tableData, overallStatsProgress }), [tableData, overallStatsProgress]);
};
