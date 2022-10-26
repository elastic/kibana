/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { Aggregators, MetricExpressionParams } from '../../../../../common/alerting/metrics';
import { groupByForContainerContext, NUMBER_OF_DOCUMENTS, termsAggMapping } from '../../common/utils';
import { createBucketSelector } from './create_bucket_selector';
import { createPercentileAggregation } from './create_percentile_aggregation';
import { createRateAggsBuckets, createRateAggsBucketScript } from './create_rate_aggregation';
import { wrapInCurrentPeriod } from './wrap_in_period';

const getParsedFilterQuery: (filterQuery: string | undefined) => Record<string, any> | null = (
  filterQuery
) => {
  if (!filterQuery) return null;
  return JSON.parse(filterQuery);
};

export const getElasticsearchMetricQuery = (
  metricParams: MetricExpressionParams,
  timeframe: { start: number; end: number },
  compositeSize: number,
  alertOnGroupDisappear: boolean,
  lastPeriodEnd?: number,
  groupBy?: string | string[],
  filterQuery?: string,
  afterKey?: Record<string, string>,
  fieldsExisted?: Record<string, boolean> | null
) => {
  const { metric, aggType } = metricParams;
  if (aggType === Aggregators.COUNT && metric) {
    throw new Error('Cannot aggregate document count with a metric');
  }
  if (aggType !== Aggregators.COUNT && !metric) {
    throw new Error('Can only aggregate without a metric if using the document count aggregator');
  }

  // We need to make a timeframe that represents the current timeframe as oppose
  // to the total timeframe (which includes the last period).
  const currentTimeframe = {
    ...timeframe,
    start: moment(timeframe.end)
      .subtract(
        metricParams.aggType === Aggregators.RATE
          ? metricParams.timeSize * 2
          : metricParams.timeSize,
        metricParams.timeUnit
      )
      .valueOf(),
  };

  const metricAggregations =
    aggType === Aggregators.COUNT
      ? {}
      : aggType === Aggregators.RATE
      ? createRateAggsBuckets(currentTimeframe, 'aggregatedValue', metric)
      : aggType === Aggregators.P95 || aggType === Aggregators.P99
      ? createPercentileAggregation(aggType, metric)
      : {
          aggregatedValue: {
            [aggType]: {
              field: metric,
            },
          },
        };

  const bucketSelectorAggregations = createBucketSelector(
    metricParams,
    alertOnGroupDisappear,
    groupBy,
    lastPeriodEnd
  );

  const rateAggBucketScript =
    metricParams.aggType === Aggregators.RATE
      ? createRateAggsBucketScript(currentTimeframe, 'aggregatedValue')
      : {};

  const currentPeriod = wrapInCurrentPeriod(currentTimeframe, metricAggregations);

  const containerContextAgg =
    groupBy?.includes(groupByForContainerContext) &&
      fieldsExisted &&
      fieldsExisted[termsAggMapping.groupByForContainerContext]
      ? {
        containers: {
          terms: {
            field: termsAggMapping.groupByForContainerContext,
            size: NUMBER_OF_DOCUMENTS
          },
          aggs: {
            containerContext: {
              top_hits: {
                size: 1,
                _source: {
                  includes: ['container.*']
                },
              },
            }
          }
        }
      }
      : null;

  const includesList = ['host.*', 'labels.*', 'tags', 'cloud.*', 'orchestrator.*'];
  if(containerContextAgg === null) includesList.push('container.*');

  const excludesList = ['host.cpu.*', 'host.disk.*', 'host.network.*'];

  const additionalContextAgg = {
    additionalContext: {
      top_hits: {
        size: 1,
        _source: {
          includes: includesList,
          excludes: excludesList,
        },
      },
    },
  };

  const aggs: any = groupBy
    ? {
        groupings: {
          composite: {
            size: compositeSize,
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
          aggs: {
            ...currentPeriod,
            ...rateAggBucketScript,
            ...bucketSelectorAggregations,
            ...additionalContextAgg,
            ...containerContextAgg,
          },
        },
      }
    : {
        all: {
          filters: {
            filters: {
              all: {
                match_all: {},
              },
            },
          },
          aggs: {
            ...currentPeriod,
            ...rateAggBucketScript,
            ...bucketSelectorAggregations,
          },
        },
      };

  if (aggs.groupings && afterKey) {
    aggs.groupings.composite.after = afterKey;
  }

  const rangeFilters = [
    {
      range: {
        '@timestamp': {
          gte: moment(timeframe.start).toISOString(),
          lte: moment(timeframe.end).toISOString(),
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
    track_total_hits: true,
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
