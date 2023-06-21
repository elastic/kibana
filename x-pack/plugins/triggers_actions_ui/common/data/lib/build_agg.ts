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
  topHitsSize?: number;
  condition?: {
    resultLimit?: number;
    conditionScript: string;
  };
}

export const BUCKET_SELECTOR_PATH_NAME = 'compareValue';
export const BUCKET_SELECTOR_FIELD = `params.${BUCKET_SELECTOR_PATH_NAME}`;
export const DEFAULT_GROUPS = 100;

export const isCountAggregation = (aggType: string) => aggType === 'count';
export const isGroupAggregation = (termField?: string) => !!termField;

export const buildAggregation = ({
  timeSeries,
  aggType,
  aggField,
  termField,
  termSize,
  condition,
  topHitsSize,
}: BuildAggregationOpts): Record<string, AggregationsAggregationContainer> => {
  const aggContainer = {
    aggs: {},
  };
  const isCountAgg = isCountAggregation(aggType);
  const isGroupAgg = isGroupAggregation(termField);
  const isDateAgg = !!timeSeries;
  const includeConditionInQuery = !!condition;

  let dateRangeInfo: DateRangeInfo | null = null;
  if (isDateAgg) {
    const { timeWindowSize, timeWindowUnit, dateStart, dateEnd, interval } = timeSeries;
    const window = `${timeWindowSize}${timeWindowUnit}`;
    dateRangeInfo = getDateRangeInfo({ dateStart, dateEnd, window, interval });
  }

  // Cap the maximum number of terms returned to the resultLimit if defined
  // Use resultLimit + 1 because we're using the bucket selector aggregation
  // to apply the threshold condition to the ES query. We don't seem to be
  // able to get the true cardinality from the bucket selector (i.e., get
  // the number of buckets that matched the selector condition without actually
  // retrieving the bucket data). By using resultLimit + 1, we can count the number
  // of buckets returned and if the value is greater than resultLimit, we know that
  // there is additional alert data that we're not returning.
  let terms = termSize || DEFAULT_GROUPS;
  terms =
    includeConditionInQuery && condition.resultLimit
      ? terms > condition.resultLimit
        ? condition.resultLimit + 1
        : terms
      : terms;

  let aggParent: any = aggContainer;

  const getAggName = () => (isDateAgg ? 'sortValueAgg' : 'metricAgg');

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
        [getAggName()]: sortOrder,
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
  if (isDateAgg) {
    aggParent.aggs = {
      ...aggParent.aggs,
      dateAgg: {
        date_range: {
          field: timeSeries.timeField,
          format: 'strict_date_time',
          ranges: dateRangeInfo!.dateRanges,
        },
      },
    };
  }

  if (isGroupAgg && topHitsSize) {
    aggParent.aggs = {
      ...aggParent.aggs,
      topHitsAgg: {
        top_hits: {
          size: topHitsSize,
        },
      },
    };
  }

  // if not count, add a sorted value agg
  if (!isCountAgg) {
    aggParent.aggs = {
      ...aggParent.aggs,
      [getAggName()]: {
        [aggType]: {
          field: aggField,
        },
      },
    };

    if (isGroupAgg && includeConditionInQuery) {
      aggParent.aggs.conditionSelector = {
        bucket_selector: {
          buckets_path: {
            [BUCKET_SELECTOR_PATH_NAME]: getAggName(),
          },
          script: condition.conditionScript,
        },
      };
    }
  }

  if (timeSeries && dateRangeInfo) {
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
  }

  return aggContainer.aggs;
};
