/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';
import { networkTraffic } from '../../../../../common/inventory_models/shared/metrics/snapshot/network_traffic';
import { MetricExpressionParams, Aggregators } from '../types';
import { getIntervalInSeconds } from '../../../../utils/get_interval_in_seconds';
import { roundTimestamp } from '../../../../utils/round_timestamp';
import { createPercentileAggregation } from './create_percentile_aggregation';
import { calculateDateHistogramOffset } from '../../../metrics/lib/calculate_date_histogram_offset';

const MINIMUM_BUCKETS = 5;
const COMPOSITE_RESULTS_PER_PAGE = 100;

const getParsedFilterQuery: (filterQuery: string | undefined) => Record<string, any> | null = (
  filterQuery
) => {
  if (!filterQuery) return null;
  return JSON.parse(filterQuery);
};

export const getElasticsearchMetricQuery = (
  { metric, aggType, timeUnit, timeSize }: MetricExpressionParams,
  timefield: string,
  groupBy?: string | string[],
  filterQuery?: string,
  timeframe?: { start: number; end: number }
) => {
  if (aggType === Aggregators.COUNT && metric) {
    throw new Error('Cannot aggregate document count with a metric');
  }
  if (aggType !== Aggregators.COUNT && !metric) {
    throw new Error('Can only aggregate without a metric if using the document count aggregator');
  }
  const interval = `${timeSize}${timeUnit}`;
  const intervalAsSeconds = getIntervalInSeconds(interval);
  const intervalAsMS = intervalAsSeconds * 1000;

  const to = moment(timeframe ? timeframe.end : Date.now())
    .add(1, timeUnit)
    .startOf(timeUnit)
    .valueOf();

  // We need enough data for 5 buckets worth of data. We also need
  // to convert the intervalAsSeconds to milliseconds.
  const minimumFrom = to - intervalAsMS * MINIMUM_BUCKETS;

  const from = roundTimestamp(
    timeframe && timeframe.start <= minimumFrom ? timeframe.start : minimumFrom,
    timeUnit
  );

  const deliveryDelay = 60 * 1000; // INFO: This allows us to account for any delay ES has in indexing the most recent data.

  const aggregations =
    aggType === Aggregators.COUNT
      ? {}
      : aggType === Aggregators.RATE
      ? networkTraffic('aggregatedValue', metric)
      : aggType === Aggregators.P95 || aggType === Aggregators.P99
      ? createPercentileAggregation(aggType, metric)
      : {
          aggregatedValue: {
            [aggType]: {
              field: metric,
            },
          },
        };

  const baseAggs =
    aggType === Aggregators.RATE
      ? {
          aggregatedIntervals: {
            date_histogram: {
              field: timefield,
              fixed_interval: interval,
              offset: calculateDateHistogramOffset({ from, to, interval, field: timefield }),
              extended_bounds: {
                min: from,
                max: to,
              },
            },
            aggregations,
          },
        }
      : {
          aggregatedIntervals: {
            date_range: {
              field: timefield,
              ranges: [
                {
                  from: to - intervalAsMS - deliveryDelay,
                  to: to - deliveryDelay,
                },
              ],
            },
            aggregations,
          },
        };

  const aggs = groupBy
    ? {
        groupings: {
          composite: {
            size: COMPOSITE_RESULTS_PER_PAGE,
            sources: Array.isArray(groupBy)
              ? groupBy.map((field, index) => ({
                  [`groupBy${index}`]: {
                    terms: { field },
                  },
                }))
              : [
                  {
                    groupBy0: {
                      terms: {
                        field: groupBy,
                      },
                    },
                  },
                ],
          },
          aggs: baseAggs,
        },
      }
    : baseAggs;

  const rangeFilters = [
    {
      range: {
        '@timestamp': {
          gte: from,
          lte: to,
          format: 'epoch_millis',
        },
      },
    },
  ];

  const metricFieldFilters = metric
    ? [
        {
          exists: {
            field: metric,
          },
        },
      ]
    : [];

  const parsedFilterQuery = getParsedFilterQuery(filterQuery);

  return {
    query: {
      bool: {
        filter: [
          ...rangeFilters,
          ...metricFieldFilters,
          ...(parsedFilterQuery ? [parsedFilterQuery] : []),
        ],
      },
    },
    size: 0,
    aggs,
  };
};
