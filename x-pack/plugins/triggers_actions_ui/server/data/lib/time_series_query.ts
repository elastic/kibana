/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { Logger } from 'kibana/server';
import type { ElasticsearchClient } from 'src/core/server';
import { getEsErrorMessage } from '../../../../alerting/server';
import { DEFAULT_GROUPS } from '../index';
import { getDateRangeInfo } from './date_range_info';

import { TimeSeriesQuery, TimeSeriesResult, TimeSeriesResultRow } from './time_series_types';
export type { TimeSeriesQuery, TimeSeriesResult } from './time_series_types';

export interface TimeSeriesQueryParameters {
  logger: Logger;
  esClient: ElasticsearchClient;
  query: TimeSeriesQuery;
}

export async function timeSeriesQuery(
  params: TimeSeriesQueryParameters
): Promise<TimeSeriesResult> {
  const { logger, esClient, query: queryParams } = params;
  const { index, timeWindowSize, timeWindowUnit, interval, timeField, dateStart, dateEnd } =
    queryParams;

  const window = `${timeWindowSize}${timeWindowUnit}`;
  const dateRangeInfo = getDateRangeInfo({ dateStart, dateEnd, window, interval });

  // core query
  // Constructing a typesafe ES query in JS is problematic, use any escapehatch for now
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const esQuery: any = {
    index,
    body: {
      size: 0,
      query: {
        bool: {
          filter: {
            range: {
              [timeField]: {
                gte: dateRangeInfo.dateStart,
                lt: dateRangeInfo.dateEnd,
                format: 'strict_date_time',
              },
            },
          },
        },
      },
      // aggs: {...}, filled in below
    },
    ignore_unavailable: true,
    allow_no_indices: true,
  };

  // add the aggregations
  const { aggType, aggField, termField, termSize } = queryParams;

  const isCountAgg = aggType === 'count';
  const isGroupAgg = !!termField;

  let aggParent = esQuery.body;

  // first, add a group aggregation, if requested
  if (isGroupAgg) {
    aggParent.aggs = {
      groupAgg: {
        terms: {
          field: termField,
          size: termSize || DEFAULT_GROUPS,
        },
      },
    };

    // if not count add an order
    if (!isCountAgg) {
      const sortOrder = aggType === 'min' ? 'asc' : 'desc';
      aggParent.aggs.groupAgg.terms.order = {
        sortValueAgg: sortOrder,
      };
    }

    aggParent = aggParent.aggs.groupAgg;
  }

  // next, add the time window aggregation
  aggParent.aggs = {
    dateAgg: {
      date_range: {
        field: timeField,
        format: 'strict_date_time',
        ranges: dateRangeInfo.dateRanges,
      },
    },
  };

  // if not count, add a sorted value agg
  if (!isCountAgg) {
    aggParent.aggs.sortValueAgg = {
      [aggType]: {
        field: aggField,
      },
    };
  }

  aggParent = aggParent.aggs.dateAgg;

  // finally, the metric aggregation, if requested
  if (!isCountAgg) {
    aggParent.aggs = {
      metricAgg: {
        [aggType]: {
          field: aggField,
        },
      },
    };
  }

  const logPrefix = 'indexThreshold timeSeriesQuery: callCluster';
  logger.debug(`${logPrefix} call: ${JSON.stringify(esQuery)}`);
  let esResult: estypes.SearchResponse<unknown>;
  // note there are some commented out console.log()'s below, which are left
  // in, as they are VERY useful when debugging these queries; debug logging
  // isn't as nice since it's a single long JSON line.

  // console.log('time_series_query.ts request\n', JSON.stringify(esQuery, null, 4));
  try {
    esResult = (await esClient.search(esQuery, { ignore: [404], meta: true })).body;
  } catch (err) {
    // console.log('time_series_query.ts error\n', JSON.stringify(err, null, 4));
    logger.warn(`${logPrefix} error: ${getEsErrorMessage(err)}`);
    return { results: [] };
  }

  // console.log('time_series_query.ts response\n', JSON.stringify(esResult, null, 4));
  logger.debug(`${logPrefix} result: ${JSON.stringify(esResult)}`);
  return getResultFromEs(isCountAgg, isGroupAgg, esResult);
}

export function getResultFromEs(
  isCountAgg: boolean,
  isGroupAgg: boolean,
  esResult: estypes.SearchResponse<unknown>
): TimeSeriesResult {
  const aggregations = esResult?.aggregations || {};

  // add a fake 'all documents' group aggregation, if a group aggregation wasn't used
  if (!isGroupAgg && aggregations.dateAgg) {
    const dateAgg = aggregations.dateAgg;

    aggregations.groupAgg = {
      buckets: [{ key: 'all documents', dateAgg }],
    };

    delete aggregations.dateAgg;
  }

  // @ts-expect-error specify aggregations type explicitly
  const groupBuckets = aggregations.groupAgg?.buckets || [];
  const result: TimeSeriesResult = {
    results: [],
  };

  for (const groupBucket of groupBuckets) {
    const groupName: string = `${groupBucket?.key}`;
    const dateBuckets = groupBucket?.dateAgg?.buckets || [];
    const groupResult: TimeSeriesResultRow = {
      group: groupName,
      metrics: [],
    };
    result.results.push(groupResult);

    for (const dateBucket of dateBuckets) {
      const date: string = dateBucket.to_as_string;
      const value: number = isCountAgg ? dateBucket.doc_count : dateBucket.metricAgg.value;
      groupResult.metrics.push([date, value]);
    }
  }

  return result;
}
