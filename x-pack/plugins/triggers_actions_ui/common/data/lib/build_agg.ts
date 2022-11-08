/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { AggregationsAggregationContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { DateRangeInfo, getDateRangeInfo } from './date_range_info';

export interface BuildAggregationOpts {
  timeSeries?: {
    timeField: string;
    dateStart?: string;
    dateEnd?: string;
    interval?: string;
    timeWindowSize: number;
    timeWindowUnit: string;
  };
  aggType: string;
  aggField?: string;
  termSize?: number;
  termField?: string;
  condition?: {
    resultLimit: number;
    conditionScript: string;
  };
}

export const BUCKET_SELECTOR_PATH_NAME = 'compareValue';
export const BUCKET_SELECTOR_FIELD = `params.${BUCKET_SELECTOR_PATH_NAME}`;
export const DEFAULT_GROUPS = 100;

export const buildAggregation = ({
  timeSeries,
  aggType,
  aggField,
  termField,
  termSize,
  condition,
}: BuildAggregationOpts): Record<string, AggregationsAggregationContainer> => {
  const aggContainer = {
    aggs: {},
  };
  const isCountAgg = aggType === 'count';
  const isGroupAgg = !!termField;
  const includeConditionInQuery = !!condition;

  let dateRangeInfo: DateRangeInfo | null = null;
  if (timeSeries) {
    const { timeWindowSize, timeWindowUnit, dateStart, dateEnd, interval } = timeSeries;
    const window = `${timeWindowSize}${timeWindowUnit}`;
    dateRangeInfo = getDateRangeInfo({ dateStart, dateEnd, window, interval });
  }

  let terms = termSize || DEFAULT_GROUPS;
  terms = includeConditionInQuery
    ? terms > condition.resultLimit
      ? condition.resultLimit + 1
      : terms
    : terms;

  let aggParent: any = aggContainer;

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
      aggParent.aggs.groupAgg.terms!.order = {
        sortValueAgg: sortOrder,
      };
    } else if (includeConditionInQuery) {
      aggParent.aggs.groupAgg.aggs = {
        conditionSelector: {
          bucket_selector: {
            buckets_path: {
              [BUCKET_SELECTOR_PATH_NAME]: '_count',
            },
            script: condition.conditionScript,
          },
        },
      };
    }

    aggParent = aggParent.aggs.groupAgg;
  }

  // next, add the time window aggregation
  if (timeSeries && dateRangeInfo) {
    aggParent.aggs = {
      ...aggParent.aggs,
      dateAgg: {
        date_range: {
          field: timeSeries.timeField,
          format: 'strict_date_time',
          ranges: dateRangeInfo.dateRanges,
        },
      },
    };
  }

  // if not count, add a sorted value agg
  if (!isCountAgg) {
    aggParent.aggs = {
      ...aggParent.aggs,
      sortValueAgg: {
        [aggType]: {
          field: aggField,
        },
      },
    };

    if (isGroupAgg && includeConditionInQuery) {
      aggParent.aggs = {
        ...aggParent.aggs,
        conditionSelector: {
          bucket_selector: {
            buckets_path: {
              [BUCKET_SELECTOR_PATH_NAME]: 'sortValueAgg',
            },
            script: condition.conditionScript,
          },
        },
      };
    }
  }

  if (timeSeries && dateRangeInfo) {
    aggParent = aggParent.aggs.dateAgg;
  }

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

  return aggContainer.aggs;
};
