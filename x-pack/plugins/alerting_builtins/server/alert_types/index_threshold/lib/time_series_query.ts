/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DEFAULT_GROUPS } from '../index';
import { getDateRangeInfo } from './date_range_info';
import { Logger, CallCluster } from '../../../types';

import { TimeSeriesQuery, TimeSeriesResult, TimeSeriesResultRow } from './time_series_types';
export { TimeSeriesQuery, TimeSeriesResult } from './time_series_types';

export interface TimeSeriesQueryParameters {
  logger: Logger;
  callCluster: CallCluster;
  query: TimeSeriesQuery;
}

export async function timeSeriesQuery(
  params: TimeSeriesQueryParameters
): Promise<TimeSeriesResult> {
  const { logger, callCluster, query: queryParams } = params;
  const {
    index,
    timeWindowSize,
    timeWindowUnit,
    interval,
    timeField,
    dateStart,
    dateEnd,
  } = queryParams;

  const window = `${timeWindowSize}${timeWindowUnit}`;
  const dateRangeInfo = getDateRangeInfo({ dateStart, dateEnd, window, interval });

  // core query
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
    ignoreUnavailable: true,
    allowNoIndices: true,
    ignore: [404],
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
    aggParent = aggParent.aggs.groupAgg;
  }

  // next, add the time window aggregation
  aggParent.aggs = {
    dateAgg: {
      date_range: {
        field: timeField,
        ranges: dateRangeInfo.dateRanges,
      },
    },
  };
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

  let esResult: any;
  const logPrefix = 'indexThreshold timeSeriesQuery: callCluster';
  logger.debug(`${logPrefix} call: ${JSON.stringify(esQuery)}`);

  try {
    esResult = await callCluster('search', esQuery);
  } catch (err) {
    logger.warn(`${logPrefix} error: ${JSON.stringify(err.message)}`);
    throw new Error('error running search');
  }

  logger.debug(`${logPrefix} result: ${JSON.stringify(esResult)}`);
  return getResultFromEs(isCountAgg, isGroupAgg, esResult);
}

function getResultFromEs(
  isCountAgg: boolean,
  isGroupAgg: boolean,
  esResult: Record<string, any>
): TimeSeriesResult {
  const aggregations = esResult?.aggregations || {};

  // add a fake 'all documents' group aggregation, if a group aggregation wasn't used
  if (!isGroupAgg) {
    const dateAgg = aggregations.dateAgg || {};

    aggregations.groupAgg = {
      buckets: [{ key: 'all documents', dateAgg }],
    };

    delete aggregations.dateAgg;
  }

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
