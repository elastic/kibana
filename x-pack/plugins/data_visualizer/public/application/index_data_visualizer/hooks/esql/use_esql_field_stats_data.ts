/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESQL_SEARCH_STRATEGY } from '@kbn/data-plugin/common';
import type { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';
import type { AggregateQuery } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { isDefined } from '@kbn/ml-is-defined';
import { useEffect, useReducer, useState } from 'react';
import { chunk } from 'lodash';
import { useCancellableSearch } from '@kbn/ml-cancellable-search';
import type {
  DataStatsFetchProgress,
  DateFieldStats,
  FieldExamples,
  FieldStats,
  StringFieldStats,
} from '../../../../../common/types/field_stats';
import { useDataVisualizerKibana } from '../../../kibana_context';
import { getInitialProgress, getReducer } from '../../progress_utils';
import { PERCENTILE_SPACING } from '../../search_strategy/requests/constants';
import {
  getSafeESQLName,
  getESQLPercentileQueryArray,
  isESQLQuery,
  getSafeESQLLimitSize,
} from '../../search_strategy/requests/esql_utils';
import { processDistributionData } from '../../utils/process_distribution_data';
import type { Column } from './use_esql_overall_stats_data';

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

type BucketCount = number;
type BucketTerm = string;

export const useESQLFieldStatsData = <T extends Column>({
  searchQuery,
  columns: allColumns,
  filter,
  limitSize,
}: {
  searchQuery?: AggregateQuery;
  columns?: T[];
  filter?: QueryDslQueryContainer;
  limitSize?: string;
}) => {
  const [fieldStats, setFieldStats] = useState<Map<string, FieldStats>>();

  const [fetchState, setFetchState] = useReducer(
    getReducer<DataStatsFetchProgress>(),
    getInitialProgress()
  );

  const {
    services: {
      data,
      notifications: { toasts },
    },
  } = useDataVisualizerKibana();

  const { runRequest, cancelRequest } = useCancellableSearch(data);

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
          // By default, limit the source data to 100,000 rows
          const esqlBaseQuery = searchQuery.esql + getSafeESQLLimitSize(limitSize);

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
                  query: `${getSafeESQLName(`${field.name}_min`)} = MIN(${getSafeESQLName(
                    field.name
                  )}),
                ${getSafeESQLName(`${field.name}_max`)} = MAX(${getSafeESQLName(field.name)}),
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
                  query: `| STATS ${getSafeESQLName(
                    `${field.name}_terms`
                  )} = count(${getSafeESQLName(field.name)}) BY ${getSafeESQLName(field.name)}
                  | LIMIT 10
                  | SORT ${getSafeESQLName(`${field.name}_terms`)} DESC`,
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
                  query: `| STATS ${getSafeESQLName(
                    `${field.name}_terms`
                  )} = count(${getSafeESQLName(field.name)}) BY ${getSafeESQLName(field.name)}
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
                  query: `${getSafeESQLName(`${field.name}_earliest`)} = MIN(${getSafeESQLName(
                    field.name
                  )}), ${getSafeESQLName(`${field.name}_latest`)} = MAX(${getSafeESQLName(
                    field.name
                  )})`,
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
    [allColumns, JSON.stringify({ filter }), limitSize]
  );

  return { fieldStats, fieldStatsProgress: fetchState };
};
