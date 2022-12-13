/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { Logger } from '@kbn/core/server';
import type { ElasticsearchClient } from '@kbn/core/server';
import { getEsErrorMessage } from '@kbn/alerting-plugin/server';
import { toElasticsearchQuery, fromKueryExpression } from '@kbn/es-query';
import { DEFAULT_GROUPS } from '..';
import { getDateRangeInfo } from './date_range_info';

import {
  TimeSeriesQuery,
  TimeSeriesResult,
  TimeSeriesResultRow,
  TimeSeriesCondition,
} from './time_series_types';
export type { TimeSeriesQuery, TimeSeriesResult } from './time_series_types';

export const TIME_SERIES_BUCKET_SELECTOR_PATH_NAME = 'compareValue';
export const TIME_SERIES_BUCKET_SELECTOR_FIELD = `params.${TIME_SERIES_BUCKET_SELECTOR_PATH_NAME}`;

export interface TimeSeriesQueryParameters {
  logger: Logger;
  esClient: ElasticsearchClient;
  query: TimeSeriesQuery;
  condition?: TimeSeriesCondition;
}

export async function timeSeriesQuery(
  params: TimeSeriesQueryParameters
): Promise<TimeSeriesResult> {
  const { logger, esClient, query: queryParams, condition: conditionParams } = params;
  const {
    index,
    timeWindowSize,
    timeWindowUnit,
    interval,
    timeField,
    dateStart,
    dateEnd,
    filterKuery,
  } = queryParams;

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
          filter: [
            {
              range: {
                [timeField]: {
                  gte: dateRangeInfo.dateStart,
                  lt: dateRangeInfo.dateEnd,
                  format: 'strict_date_time',
                },
              },
            },
            ...(!!filterKuery ? [toElasticsearchQuery(fromKueryExpression(filterKuery))] : []),
          ],
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
  const includeConditionInQuery = !!conditionParams;

  // Cap the maximum number of terms returned to the resultLimit if defined
  // Use resultLimit + 1 because we're using the bucket selector aggregation
  // to apply the threshold condition to the ES query. We don't seem to be
  // able to get the true cardinality from the bucket selector (i.e., get
  // the number of buckets that matched the selector condition without actually
  // retrieving the bucket data). By using resultLimit + 1, we can count the number
  // of buckets returned and if the value is greater than resultLimit, we know that
  // there is additional alert data that we're not returning.
  let terms = termSize || DEFAULT_GROUPS;
  terms = includeConditionInQuery
    ? terms > conditionParams.resultLimit
      ? conditionParams.resultLimit + 1
      : terms
    : terms;

  let aggParent = esQuery.body;

  // first, add a group aggregation, if requested
  if (isGroupAgg) {
    aggParent.aggs = {
      groupAgg: {
        terms: {
          field: termField,
          size: terms,
        },
      },
      ...(includeConditionInQuery
        ? {
            groupAggCount: {
              stats_bucket: {
                buckets_path: 'groupAgg._count',
              },
            },
          }
        : {}),
    };

    // if not count add an order
    if (!isCountAgg) {
      const sortOrder = aggType === 'min' ? 'asc' : 'desc';
      aggParent.aggs.groupAgg.terms.order = {
        sortValueAgg: sortOrder,
      };
    } else if (includeConditionInQuery) {
      aggParent.aggs.groupAgg.aggs = {
        conditionSelector: {
          bucket_selector: {
            buckets_path: {
              [TIME_SERIES_BUCKET_SELECTOR_PATH_NAME]: '_count',
            },
            script: conditionParams.conditionScript,
          },
        },
      };
    }

    aggParent = aggParent.aggs.groupAgg;
  }

  // next, add the time window aggregation
  aggParent.aggs = {
    ...aggParent.aggs,
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

    if (isGroupAgg && includeConditionInQuery) {
      aggParent.aggs.conditionSelector = {
        bucket_selector: {
          buckets_path: {
            [TIME_SERIES_BUCKET_SELECTOR_PATH_NAME]: 'sortValueAgg',
          },
          script: conditionParams.conditionScript,
        },
      };
    }
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
    return { results: [], truncated: false };
  }

  // console.log('time_series_query.ts response\n', JSON.stringify(esResult, null, 4));
  logger.debug(`${logPrefix} result: ${JSON.stringify(esResult)}`);
  return getResultFromEs({
    isCountAgg,
    isGroupAgg,
    isConditionInQuery: includeConditionInQuery,
    esResult,
    resultLimit: conditionParams?.resultLimit,
  });
}

interface GetResultFromEsParams {
  isCountAgg: boolean;
  isGroupAgg: boolean;
  isConditionInQuery: boolean;
  esResult: estypes.SearchResponse<unknown>;
  resultLimit?: number;
}

export function getResultFromEs({
  isCountAgg,
  isGroupAgg,
  isConditionInQuery,
  esResult,
  resultLimit,
}: GetResultFromEsParams): TimeSeriesResult {
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
  // @ts-expect-error specify aggregations type explicitly
  const numGroupsTotal = aggregations.groupAggCount?.count ?? 0;
  const result: TimeSeriesResult = {
    results: [],
    truncated: isConditionInQuery && resultLimit ? numGroupsTotal > resultLimit : false,
  };

  for (const groupBucket of groupBuckets) {
    if (resultLimit && result.results.length === resultLimit) break;

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
