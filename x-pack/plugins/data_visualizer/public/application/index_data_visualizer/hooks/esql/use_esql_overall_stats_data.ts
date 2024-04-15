/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESQL_SEARCH_STRATEGY, KBN_FIELD_TYPES } from '@kbn/data-plugin/common';
import type { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';
import type { AggregateQuery } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { type UseCancellableSearch, useCancellableSearch } from '@kbn/ml-cancellable-search';
import type { estypes } from '@elastic/elasticsearch';
import type { ISearchOptions } from '@kbn/data-plugin/common';
import type { TimeBucketsInterval } from '@kbn/ml-time-buckets';
import { getESQLWithSafeLimit, ESQL_LATEST_VERSION } from '@kbn/esql-utils';
import { OMIT_FIELDS } from '../../../../../common/constants';
import type {
  DataStatsFetchProgress,
  DocumentCountStats,
} from '../../../../../common/types/field_stats';
import { getSupportedFieldType } from '../../../common/components/fields_stats_grid/get_field_names';
import { useDataVisualizerKibana } from '../../../kibana_context';
import { getInitialProgress, getReducer } from '../../progress_utils';
import { getSafeESQLName, isESQLQuery } from '../../search_strategy/requests/esql_utils';
import type { NonAggregatableField } from '../../types/overall_stats';
import { getESQLSupportedAggs } from '../../utils/get_supported_aggs';
import { getESQLOverallStats } from '../../search_strategy/esql_requests/get_count_and_cardinality';
import type { AggregatableField } from '../../types/esql_data_visualizer';
import {
  handleError,
  type HandleErrorCallback,
} from '../../search_strategy/esql_requests/handle_error';

export interface Column {
  type: string;
  name: string;
  secondaryType: string;
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

const getESQLDocumentCountStats = async (
  runRequest: UseCancellableSearch['runRequest'],
  query: AggregateQuery,
  filter?: estypes.QueryDslQueryContainer,
  timeFieldName?: string,
  intervalMs?: number,
  searchOptions?: ISearchOptions,
  onError?: HandleErrorCallback
): Promise<{ documentCountStats?: DocumentCountStats; totalCount: number; request?: object }> => {
  if (!isESQLQuery(query)) {
    throw Error(
      i18n.translate('xpack.dataVisualizer.esql.noQueryProvided', {
        defaultMessage: 'No ES|QL query provided',
      })
    );
  }
  const esqlBaseQuery = query.esql;
  let earliestMs = Infinity;
  let latestMs = -Infinity;

  if (timeFieldName) {
    const aggQuery = ` | EVAL _timestamp_= TO_DOUBLE(DATE_TRUNC(${intervalMs} millisecond, ${getSafeESQLName(
      timeFieldName
    )}))
    | stats rows = count(*) by _timestamp_`;

    const request = {
      params: {
        query: esqlBaseQuery + aggQuery,
        ...(filter ? { filter } : {}),
        version: ESQL_LATEST_VERSION,
      },
    };
    try {
      const esqlResults = await runRequest(request, { ...(searchOptions ?? {}), strategy: 'esql' });
      let totalCount = 0;
      const _buckets: Record<string, number> = {};
      // @ts-expect-error ES types needs to be updated with columns and values as part of esql response
      esqlResults?.rawResponse.values.forEach((val) => {
        const [count, bucket] = val;
        _buckets[bucket] = count;
        totalCount += count;
        if (bucket < earliestMs) {
          earliestMs = bucket;
        }
        if (bucket >= latestMs) {
          latestMs = bucket;
        }
      });
      const result: DocumentCountStats = {
        interval: intervalMs,
        probability: 1,
        randomlySampled: false,
        timeRangeEarliest: earliestMs,
        timeRangeLatest: latestMs,
        buckets: _buckets,
        totalCount,
      };
      return { documentCountStats: result, totalCount, request };
    } catch (error) {
      handleError({
        request,
        error,
        onError,
        title: i18n.translate('xpack.dataVisualizer.esql.docCountError', {
          defaultMessage: `Error getting total count & doc count chart for ES|QL time-series data for request:`,
        }),
      });
      return Promise.reject(error);
    }
  } else {
    //  If not time field, get the total count
    const request = {
      params: {
        query: esqlBaseQuery + ' | STATS _count_ = COUNT(*)  | LIMIT 1',
        ...(filter ? { filter } : {}),
        version: ESQL_LATEST_VERSION,
      },
    };
    try {
      const esqlResults = await runRequest(request, { ...(searchOptions ?? {}), strategy: 'esql' });
      return {
        request,
        documentCountStats: undefined,
        totalCount: esqlResults?.rawResponse.values[0][0],
      };
    } catch (error) {
      handleError({
        request,
        error,
        onError,
        title: i18n.translate('xpack.dataVisualizer.esql.docCountNoneTimeseriesError', {
          defaultMessage: `Error getting total count for ES|QL data:`,
        }),
      });
      return Promise.reject(error);
    }
  }
};

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

const fieldStatsErrorTitle = i18n.translate(
  'xpack.dataVisualizer.index.errorFetchingESQLFieldStatisticsMessage',
  {
    defaultMessage: 'Error fetching field statistics for ES|QL query',
  }
);

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
        limit: number;
        filter?: QueryDslQueryContainer;
        totalCount?: number;
      }
    | undefined
) => {
  const {
    services: {
      data,
      notifications: { toasts },
    },
  } = useDataVisualizerKibana();

  const previousDocCountRequest = useRef('');
  const { runRequest, cancelRequest } = useCancellableSearch(data);

  const [tableData, setTableData] = useReducer(getReducer<Data>(), getInitialData());
  const [overallStatsProgress, setOverallStatsProgress] = useReducer(
    getReducer<DataStatsFetchProgress>(),
    getInitialProgress()
  );
  const onError = useCallback(
    (error, title?: string) =>
      toasts.addError(error, {
        title: title ?? fieldStatsErrorTitle,
      }),
    [toasts]
  );

  const startFetch = useCallback(
    async function fetchOverallStats() {
      try {
        cancelRequest();

        if (!fieldStatsRequest) {
          return;
        }
        setOverallStatsProgress({
          ...getInitialProgress(),
          isRunning: true,
          error: undefined,
        });

        const {
          searchQuery,
          intervalMs,
          filter: filter,
          limit,
          totalCount: knownTotalCount,
        } = fieldStatsRequest;

        if (!isESQLQuery(searchQuery)) {
          return;
        }

        const intervalInMs = intervalMs === 0 ? 60 * 60 * 60 * 10 : intervalMs;

        // For doc count chart, we want the full base query without any limit
        const esqlBaseQuery = searchQuery.esql;

        const columnsResp = await runRequest(
          {
            params: {
              query: esqlBaseQuery + '| LIMIT 0',
              ...(filter ? { filter } : {}),
              version: ESQL_LATEST_VERSION,
            },
          },
          { strategy: ESQL_SEARCH_STRATEGY }
        );
        const columns = columnsResp?.rawResponse
          ? // @ts-expect-error ES types need to be updated with columns for ESQL queries
            (columnsResp.rawResponse.columns.map((c) => ({
              ...c,
              secondaryType: getSupportedFieldType(c.type),
            })) as Column[])
          : [];

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

        // We don't need to fetch the doc count stats again if only the limit size is changed
        // so return the previous totalCount, documentCountStats if available
        const hashedDocCountParams = JSON.stringify({
          searchQuery,
          filter,
          timeFieldName,
          intervalInMs,
        });
        let { totalCount, documentCountStats } = tableData;
        if (knownTotalCount !== undefined) {
          totalCount = knownTotalCount;
        }
        if (
          knownTotalCount === undefined &&
          (totalCount === undefined ||
            documentCountStats === undefined ||
            hashedDocCountParams !== previousDocCountRequest.current)
        ) {
          setTableData({ totalCount: undefined, documentCountStats: undefined });

          previousDocCountRequest.current = hashedDocCountParams;
          const results = await getESQLDocumentCountStats(
            runRequest,
            searchQuery,
            filter,
            timeFieldName,
            intervalInMs,
            undefined,
            onError
          );

          totalCount = results.totalCount;
          documentCountStats = results.documentCountStats;
          setTableData({ totalCount, documentCountStats });
        }

        if (totalCount === undefined) {
          totalCount = 0;
        }
        setOverallStatsProgress({
          loaded: 50,
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

        setTableData({ aggregatableFields, nonAggregatableFields });

        // COUNT + CARDINALITY
        // For % count & cardinality, we want the full base query WITH specified limit
        // to safeguard against huge datasets
        const esqlBaseQueryWithLimit = getESQLWithSafeLimit(searchQuery.esql, limit);

        if (totalCount === 0) {
          setTableData({
            aggregatableFields: undefined,
            nonAggregatableFields: undefined,
            overallStats: undefined,
            columns: undefined,
            timeFieldName: undefined,
          });

          setOverallStatsProgress({
            loaded: 100,
            isRunning: false,
            error: undefined,
          });
          return;
        }
        if (totalCount > 0 && fields.length > 0) {
          const stats = await getESQLOverallStats({
            runRequest,
            fields,
            esqlBaseQueryWithLimit,
            filter,
            limitSize: limit,
            totalCount,
            onError,
          });

          setTableData({ overallStats: stats });
          setOverallStatsProgress({
            loaded: 100,
            isRunning: false,
            error: undefined,
          });
        }
      } catch (error) {
        // If error already handled in sub functions, no need to propogate
        if (error.name !== 'AbortError' && error.handled !== true) {
          toasts.addError(error, {
            title: fieldStatsErrorTitle,
          });
          // Log error to console for better debugging
          // eslint-disable-next-line no-console
          console.error(`${fieldStatsErrorTitle}: fetchOverallStats`, error);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [runRequest, toasts, JSON.stringify({ fieldStatsRequest }), onError]
  );

  // auto-update
  useEffect(() => {
    startFetch();
  }, [startFetch]);

  return useMemo(
    () => ({ ...tableData, overallStatsProgress, cancelOverallStatsRequest: cancelRequest }),
    [tableData, overallStatsProgress, cancelRequest]
  );
};
