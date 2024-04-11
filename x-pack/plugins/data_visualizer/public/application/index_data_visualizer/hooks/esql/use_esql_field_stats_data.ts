/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';
import type { AggregateQuery } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { useEffect, useReducer, useState } from 'react';
import { chunk } from 'lodash';
import { useCancellableSearch } from '@kbn/ml-cancellable-search';
import { getESQLWithSafeLimit } from '@kbn/esql-utils';
import type { DataStatsFetchProgress, FieldStats } from '../../../../../common/types/field_stats';
import { useDataVisualizerKibana } from '../../../kibana_context';
import { getInitialProgress, getReducer } from '../../progress_utils';
import { isESQLQuery } from '../../search_strategy/requests/esql_utils';
import type { Column } from './use_esql_overall_stats_data';
import { getESQLNumericFieldStats } from '../../search_strategy/esql_requests/get_numeric_field_stats';
import { getESQLKeywordFieldStats } from '../../search_strategy/esql_requests/get_keyword_fields';
import { getESQLDateFieldStats } from '../../search_strategy/esql_requests/get_date_field_stats';
import { getESQLBooleanFieldStats } from '../../search_strategy/esql_requests/get_boolean_field_stats';

export const useESQLFieldStatsData = <T extends Column>({
  searchQuery,
  columns: allColumns,
  filter,
  limit,
}: {
  searchQuery?: AggregateQuery;
  columns?: T[];
  filter?: QueryDslQueryContainer;
  limit: number;
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

        setFetchState({
          ...getInitialProgress(),
          isRunning: true,
          error: undefined,
        });
        if (!isESQLQuery(searchQuery) || !allColumns) return;

        try {
          // By default, limit the source data to 100,000 rows
          const esqlBaseQuery = getESQLWithSafeLimit(searchQuery.esql, limit);

          const totalFieldsCnt = allColumns.length;
          const processedFieldStats = new Map<string, FieldStats>();

          function addToProcessedFieldStats(stats: Array<FieldStats | undefined>) {
            if (!unmounted) {
              stats.forEach((field) => {
                if (field) {
                  processedFieldStats.set(field.fieldName!, field);
                }
              });
              setFetchState({
                loaded: (processedFieldStats.size / totalFieldsCnt) * 100,
              });
            }
          }
          setFieldStats(processedFieldStats);

          const aggregatableFieldsChunks = chunk(allColumns, 25);

          for (const columns of aggregatableFieldsChunks) {
            // GETTING STATS FOR NUMERIC FIELDS
            await getESQLNumericFieldStats({
              columns: columns.filter((f) => f.secondaryType === 'number'),
              filter,
              runRequest,
              esqlBaseQuery,
            }).then(addToProcessedFieldStats);

            // GETTING STATS FOR KEYWORD FIELDS
            await getESQLKeywordFieldStats({
              columns: columns.filter(
                (f) => f.secondaryType === 'keyword' || f.secondaryType === 'ip'
              ),
              filter,
              runRequest,
              esqlBaseQuery,
            }).then(addToProcessedFieldStats);

            // GETTING STATS FOR BOOLEAN FIELDS
            await getESQLBooleanFieldStats({
              columns: columns.filter((f) => f.secondaryType === 'boolean'),
              filter,
              runRequest,
              esqlBaseQuery,
            }).then(addToProcessedFieldStats);

            // // GETTING STATS FOR TEXT FIELDS
            // await getESQLExampleFieldValues({
            //   columns: columns.filter(
            //     (f) =>
            //       f.secondaryType === 'text' ||
            //       f.secondaryType === 'geo_point' ||
            //       f.secondaryType === 'geo_shape'
            //   ),
            //   filter,
            //   runRequest,
            //   esqlBaseQuery,
            // }).then(addToProcessedFieldStats);

            // GETTING STATS FOR DATE FIELDS
            await getESQLDateFieldStats({
              columns: columns.filter((f) => f.secondaryType === 'date'),
              filter,
              runRequest,
              esqlBaseQuery,
            }).then(addToProcessedFieldStats);
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
    [allColumns, JSON.stringify({ filter }), limit]
  );

  return { fieldStats, fieldStatsProgress: fetchState, cancelFieldStatsRequest: cancelRequest };
};
