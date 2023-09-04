/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { Aggregators, MetricExpressionParams } from '../../../../../common/threshold_rule/types';
import { isCustom, isNotCountOrCustom } from './metric_expression_params';
import { createCustomMetricsAggregations } from './create_custom_metrics_aggregations';
import {
  CONTAINER_ID,
  hasAdditionalContext,
  NUMBER_OF_DOCUMENTS,
  shouldTermsAggOnContainer,
  validGroupByForContext,
} from '../utils';
import { createBucketSelector } from './create_bucket_selector';
import { createPercentileAggregation } from './create_percentile_aggregation';
import { createRateAggsBuckets, createRateAggsBucketScript } from './create_rate_aggregation';
import { wrapInCurrentPeriod } from './wrap_in_period';
import { getParsedFilterQuery } from '../../../../utils/get_parsed_filtered_query';

export const calculateCurrentTimeframe = (
  metricParams: MetricExpressionParams,
  timeframe: { start: number; end: number }
) => ({
  ...timeframe,
  start: moment(timeframe.end)
    .subtract(
      metricParams.aggType === Aggregators.RATE ? metricParams.timeSize * 2 : metricParams.timeSize,
      metricParams.timeUnit
    )
    .valueOf(),
});

export const createBaseFilters = (
  metricParams: MetricExpressionParams,
  timeframe: { start: number; end: number },
  timeFieldName: string,
  filterQuery?: string
) => {
  const rangeFilters = [
    {
      range: {
        [timeFieldName]: {
          gte: moment(timeframe.start).toISOString(),
          lte: moment(timeframe.end).toISOString(),
        },
      },
    },
  ];

  const metricFieldFilters =
    isNotCountOrCustom(metricParams) && metricParams.metric
      ? [
          {
            exists: {
              field: metricParams.metric,
            },
          },
        ]
      : [];

  const parsedFilterQuery = getParsedFilterQuery(filterQuery);

  return [...rangeFilters, ...metricFieldFilters, ...parsedFilterQuery];
};

export const getElasticsearchMetricQuery = (
  metricParams: MetricExpressionParams,
  timeframe: { start: number; end: number },
  timeFieldName: string,
  compositeSize: number,
  alertOnGroupDisappear: boolean,
  lastPeriodEnd?: number,
  groupBy?: string | string[],
  filterQuery?: string,
  afterKey?: Record<string, string>,
  fieldsExisted?: Record<string, boolean> | null
) => {
  const { aggType } = metricParams;
  if (isNotCountOrCustom(metricParams) && !metricParams.metric) {
    throw new Error(
      'Can only aggregate without a metric if using the document count or custom aggregator'
    );
  }

  // We need to make a timeframe that represents the current timeframe as opposed
  // to the total timeframe (which includes the last period).
  const currentTimeframe = {
    ...calculateCurrentTimeframe(metricParams, timeframe),
    timeFieldName,
  };

  const metricAggregations =
    aggType === Aggregators.COUNT
      ? {}
      : aggType === Aggregators.RATE
      ? createRateAggsBuckets(currentTimeframe, 'aggregatedValue', metricParams.metric)
      : aggType === Aggregators.P95 || aggType === Aggregators.P99
      ? createPercentileAggregation(aggType, metricParams.metric)
      : isCustom(metricParams)
      ? createCustomMetricsAggregations(
          'aggregatedValue',
          metricParams.customMetrics,
          metricParams.equation
        )
      : {
          aggregatedValue: {
            [aggType]: {
              field: metricParams.metric,
            },
          },
        };

  const bucketSelectorAggregations = createBucketSelector(
    metricParams,
    alertOnGroupDisappear,
    timeFieldName,
    groupBy,
    lastPeriodEnd
  );

  const rateAggBucketScript =
    metricParams.aggType === Aggregators.RATE
      ? createRateAggsBucketScript(currentTimeframe, 'aggregatedValue')
      : {};

  const currentPeriod = wrapInCurrentPeriod(currentTimeframe, metricAggregations);

  const containerIncludesList = ['container.*'];
  const containerExcludesList = [
    'container.cpu',
    'container.memory',
    'container.disk',
    'container.network',
  ];
  const containerContextAgg =
    shouldTermsAggOnContainer(groupBy) && fieldsExisted && fieldsExisted[CONTAINER_ID]
      ? {
          containerContext: {
            terms: {
              field: CONTAINER_ID,
              size: NUMBER_OF_DOCUMENTS,
            },
            aggs: {
              container: {
                top_hits: {
                  size: 1,
                  _source: {
                    includes: containerIncludesList,
                    excludes: containerExcludesList,
                  },
                },
              },
            },
          },
        }
      : void 0;

  const includesList = ['host.*', 'labels.*', 'tags', 'cloud.*', 'orchestrator.*'];
  const excludesList = ['host.cpu', 'host.disk', 'host.network'];
  if (!containerContextAgg) {
    includesList.push(...containerIncludesList);
    excludesList.push(...containerExcludesList);
  }

  const additionalContextAgg = hasAdditionalContext(groupBy, validGroupByForContext)
    ? {
        additionalContext: {
          top_hits: {
            size: 1,
            _source: {
              includes: includesList,
              excludes: excludesList,
            },
          },
        },
      }
    : void 0;

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

  const baseFilters = createBaseFilters(metricParams, timeframe, timeFieldName, filterQuery);

  return {
    track_total_hits: true,
    query: {
      bool: {
        filter: baseFilters,
      },
    },
    size: 0,
    aggs,
  };
};
