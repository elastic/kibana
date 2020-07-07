/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mapValues, first, last, isNaN } from 'lodash';
import {
  isTooManyBucketsPreviewException,
  TOO_MANY_BUCKETS_PREVIEW_EXCEPTION,
} from '../../../../../common/alerting/metrics';
import { InfraSource } from '../../../../../common/http_api/source_api';
import { InfraDatabaseSearchResponse } from '../../../adapters/framework/adapter_types';
import { createAfterKeyHandler } from '../../../../utils/create_afterkey_handler';
import { AlertServices, AlertExecutorOptions } from '../../../../../../alerts/server';
import { getAllCompositeData } from '../../../../utils/get_all_composite_data';
import { DOCUMENT_COUNT_I18N } from '../../common/messages';
import { MetricExpressionParams, Comparator, Aggregators } from '../types';
import { getElasticsearchMetricQuery } from './metric_query';

interface Aggregation {
  aggregatedIntervals: {
    buckets: Array<{
      aggregatedValue: { value: number; values?: Array<{ key: number; value: number }> };
      doc_count: number;
    }>;
  };
}

interface CompositeAggregationsResponse {
  groupings: {
    buckets: Aggregation[];
  };
}

export const evaluateAlert = (
  callCluster: AlertServices['callCluster'],
  params: AlertExecutorOptions['params'],
  config: InfraSource['configuration'],
  timeframe?: { start: number; end: number }
) => {
  const { criteria, groupBy, filterQuery } = params as {
    criteria: MetricExpressionParams[];
    groupBy: string | undefined | string[];
    filterQuery: string | undefined;
  };
  return Promise.all(
    criteria.map(async (criterion) => {
      const currentValues = await getMetric(
        callCluster,
        criterion,
        config.metricAlias,
        config.fields.timestamp,
        groupBy,
        filterQuery,
        timeframe
      );
      const { threshold, comparator } = criterion;
      const comparisonFunction = comparatorMap[comparator];
      return mapValues(currentValues, (values: number | number[] | null) => {
        if (isTooManyBucketsPreviewException(values)) throw values;
        return {
          ...criterion,
          metric: criterion.metric ?? DOCUMENT_COUNT_I18N,
          currentValue: Array.isArray(values) ? last(values) : NaN,
          shouldFire: Array.isArray(values)
            ? values.map((value) => comparisonFunction(value, threshold))
            : [false],
          isNoData: values === null,
          isError: isNaN(values),
        };
      });
    })
  );
};

const getMetric: (
  callCluster: AlertServices['callCluster'],
  params: MetricExpressionParams,
  index: string,
  timefield: string,
  groupBy: string | undefined | string[],
  filterQuery: string | undefined,
  timeframe?: { start: number; end: number }
) => Promise<Record<string, number[]>> = async function (
  callCluster,
  params,
  index,
  timefield,
  groupBy,
  filterQuery,
  timeframe
) {
  const { aggType } = params;
  const hasGroupBy = groupBy && groupBy.length;
  const searchBody = getElasticsearchMetricQuery(
    params,
    timefield,
    hasGroupBy ? groupBy : undefined,
    filterQuery,
    timeframe
  );

  try {
    if (hasGroupBy) {
      const bucketSelector = (
        response: InfraDatabaseSearchResponse<{}, CompositeAggregationsResponse>
      ) => response.aggregations?.groupings?.buckets || [];
      const afterKeyHandler = createAfterKeyHandler(
        'aggs.groupings.composite.after',
        (response) => response.aggregations?.groupings?.after_key
      );
      const compositeBuckets = (await getAllCompositeData(
        (body) => callCluster('search', { body, index }),
        searchBody,
        bucketSelector,
        afterKeyHandler
      )) as Array<Aggregation & { key: Record<string, string> }>;
      return compositeBuckets.reduce(
        (result, bucket) => ({
          ...result,
          [Object.values(bucket.key)
            .map((value) => value)
            .join(', ')]: getValuesFromAggregations(bucket, aggType),
        }),
        {}
      );
    }
    const result = await callCluster('search', {
      body: searchBody,
      index,
    });

    return { '*': getValuesFromAggregations(result.aggregations, aggType) };
  } catch (e) {
    if (timeframe) {
      // This code should only ever be reached when previewing the alert, not executing it
      const causedByType = e.body?.error?.caused_by?.type;
      if (causedByType === 'too_many_buckets_exception') {
        return {
          '*': {
            [TOO_MANY_BUCKETS_PREVIEW_EXCEPTION]: true,
            maxBuckets: e.body.error.caused_by.max_buckets,
          },
        };
      }
    }
    return { '*': NaN }; // Trigger an Error state
  }
};

const getValuesFromAggregations = (
  aggregations: Aggregation,
  aggType: MetricExpressionParams['aggType']
) => {
  try {
    const { buckets } = aggregations.aggregatedIntervals;
    if (!buckets.length) return null; // No Data state
    if (aggType === Aggregators.COUNT) {
      return buckets.map((bucket) => bucket.doc_count);
    }
    if (aggType === Aggregators.P95 || aggType === Aggregators.P99) {
      return buckets.map((bucket) => {
        const values = bucket.aggregatedValue?.values || [];
        const firstValue = first(values);
        if (!firstValue) return null;
        return firstValue.value;
      });
    }
    return buckets.map((bucket) => bucket.aggregatedValue.value);
  } catch (e) {
    return NaN; // Error state
  }
};

const comparatorMap = {
  [Comparator.BETWEEN]: (value: number, [a, b]: number[]) =>
    value >= Math.min(a, b) && value <= Math.max(a, b),
  [Comparator.OUTSIDE_RANGE]: (value: number, [a, b]: number[]) => value < a || value > b,
  // `threshold` is always an array of numbers in case the BETWEEN/OUTSIDE_RANGE comparator is
  // used; all other compartors will just destructure the first value in the array
  [Comparator.GT]: (a: number, [b]: number[]) => a > b,
  [Comparator.LT]: (a: number, [b]: number[]) => a < b,
  [Comparator.GT_OR_EQ]: (a: number, [b]: number[]) => a >= b,
  [Comparator.LT_OR_EQ]: (a: number, [b]: number[]) => a <= b,
};
