/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '../../../../../../../../src/core/server';
import {
  Aggregators,
  Comparator,
  MetricExpressionParams,
} from '../../../../../common/alerting/metrics';
import { UNGROUPED_FACTORY_KEY } from '../../common/utils';
import { getElasticsearchMetricQuery } from './metric_query';

export type GetDataResponse = Record<
  string,
  { warn: boolean; trigger: boolean; value: number | null }
>;

type BucketKey = Record<string, string>;
interface AggregatedValue {
  value: number | null;
  values?: Record<string, number | null>;
}
interface Aggs {
  aggregatedValue: AggregatedValue;
  shouldWarn?: {
    value: number;
  };
  shouldTrigger?: {
    value: number;
  };
}
interface Bucket extends Aggs {
  key: BucketKey;
  doc_count: number;
}
interface ResponseAggregations extends Partial<Aggs> {
  groupings?: {
    after_key: Record<string, string>;
    buckets: Bucket[];
  };
  all?: {
    buckets: {
      all: {
        doc_count: number;
      } & Aggs;
    };
  };
}

const getValue = (aggregatedValue: AggregatedValue, params: MetricExpressionParams) =>
  [Aggregators.P95, Aggregators.P99].includes(params.aggType) && aggregatedValue.values != null
    ? aggregatedValue.values[params.aggType === Aggregators.P95 ? '95.0' : '99.0']
    : aggregatedValue.value;

const NO_DATA_RESPONSE = {
  [UNGROUPED_FACTORY_KEY]: {
    value: null,
    warn: false,
    trigger: false,
  },
};

export const getData = async (
  esClient: ElasticsearchClient,
  params: MetricExpressionParams,
  index: string,
  groupBy: string | undefined | string[],
  filterQuery: string | undefined,
  compositeSize: number,
  alertOnGroupDisappear: boolean,
  timeframe: { start: number; end: number },
  previousResults: GetDataResponse = {},
  afterKey?: Record<string, string>
): Promise<GetDataResponse> => {
  const handleResponse = (
    aggs: ResponseAggregations,
    previous: GetDataResponse,
    successfulShards: number
  ) => {
    // This is absolutely NO DATA
    if (successfulShards === 0) {
      return NO_DATA_RESPONSE;
    }
    if (aggs.groupings) {
      const { groupings } = aggs;
      const nextAfterKey = groupings.after_key;
      for (const bucket of groupings.buckets) {
        const key = Object.values(bucket.key).join(',');
        const { shouldWarn, shouldTrigger, aggregatedValue } = bucket;
        previous[key] = {
          trigger: (shouldTrigger && shouldTrigger.value > 0) || false,
          warn: (shouldWarn && shouldWarn.value > 0) || false,
          value: getValue(aggregatedValue, params),
        };
      }
      if (nextAfterKey) {
        return getData(
          esClient,
          params,
          index,
          groupBy,
          filterQuery,
          compositeSize,
          alertOnGroupDisappear,
          timeframe,
          previous,
          nextAfterKey
        );
      }
      return previous;
    }
    if (aggs.all) {
      const { aggregatedValue, shouldWarn, shouldTrigger } = aggs.all.buckets.all;
      const value = getValue(aggregatedValue, params);
      // There is an edge case where there is no results and the shouldWarn/shouldTrigger
      // bucket scripts will be missing. This is only an issue for document count because
      // the value will end up being ZERO, for other metrics it will be null. In this case
      // we need to do the evaluation in Node.js
      if (aggs.all && params.aggType === Aggregators.COUNT && value === 0) {
        const trigger = comparatorMap[params.comparator](value, params.threshold);
        const warn =
          params.warningThreshold && params.warningComparator
            ? comparatorMap[params.warningComparator](value, params.warningThreshold)
            : false;
        return {
          [UNGROUPED_FACTORY_KEY]: {
            value,
            warn,
            trigger,
          },
        };
      }
      return {
        [UNGROUPED_FACTORY_KEY]: {
          value,
          warn: (shouldWarn && shouldWarn.value > 0) || false,
          trigger: (shouldTrigger && shouldTrigger.value > 0) || false,
        },
      };
    } else {
      return NO_DATA_RESPONSE;
    }
  };
  const request = {
    index,
    allow_no_indices: true,
    ignore_unavailable: true,
    body: getElasticsearchMetricQuery(
      params,
      timeframe,
      compositeSize,
      alertOnGroupDisappear,
      groupBy,
      filterQuery,
      afterKey
    ),
  };
  const { body } = await esClient.search<undefined, ResponseAggregations>(request);
  if (body.aggregations) {
    return handleResponse(body.aggregations, previousResults, body._shards.successful);
  } else if (body._shards.successful) {
    return previousResults;
  }
  return NO_DATA_RESPONSE;
};

const comparatorMap = {
  [Comparator.BETWEEN]: (value: number, [a, b]: number[]) =>
    value >= Math.min(a, b) && value <= Math.max(a, b),
  // `threshold` is always an array of numbers in case the BETWEEN comparator is
  // used; all other compartors will just destructure the first value in the array
  [Comparator.GT]: (a: number, [b]: number[]) => a > b,
  [Comparator.LT]: (a: number, [b]: number[]) => a < b,
  [Comparator.OUTSIDE_RANGE]: (value: number, [a, b]: number[]) => value < a || value > b,
  [Comparator.GT_OR_EQ]: (a: number, [b]: number[]) => a >= b,
  [Comparator.LT_OR_EQ]: (a: number, [b]: number[]) => a <= b,
};
