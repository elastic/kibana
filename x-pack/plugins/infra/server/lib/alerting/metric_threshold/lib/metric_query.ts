/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { networkTraffic } from '../../../../../common/inventory_models/shared/metrics/snapshot/network_traffic';
import { MetricExpressionParams, Aggregators } from '../types';
import { createPercentileAggregation } from './create_percentile_aggregation';
import { calculateDateHistogramOffset } from '../../../metrics/lib/calculate_date_histogram_offset';

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
  timeframe: { start: number; end: number },
  groupBy?: string | string[],
  filterQuery?: string
) => {
  if (aggType === Aggregators.COUNT && metric) {
    throw new Error('Cannot aggregate document count with a metric');
  }
  if (aggType !== Aggregators.COUNT && !metric) {
    throw new Error('Can only aggregate without a metric if using the document count aggregator');
  }
  const interval = `${timeSize}${timeUnit}`;
  const to = timeframe.end;
  const from = timeframe.start;

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
      : aggregations;

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
