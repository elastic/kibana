/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapValues, first, last, isNaN } from 'lodash';
import moment from 'moment';
import { ElasticsearchClient } from 'kibana/server';
import {
  isTooManyBucketsPreviewException,
  TOO_MANY_BUCKETS_PREVIEW_EXCEPTION,
} from '../../../../../common/alerting/metrics';
import { getIntervalInSeconds } from '../../../../utils/get_interval_in_seconds';
import { roundTimestamp } from '../../../../utils/round_timestamp';
import { InfraSource } from '../../../../../common/source_configuration/source_configuration';
import { InfraDatabaseSearchResponse } from '../../../adapters/framework/adapter_types';
import { createAfterKeyHandler } from '../../../../utils/create_afterkey_handler';
import { getAllCompositeData } from '../../../../utils/get_all_composite_data';
import { DOCUMENT_COUNT_I18N } from '../../common/messages';
import { UNGROUPED_FACTORY_KEY } from '../../common/utils';
import { MetricExpressionParams, Comparator, Aggregators } from '../types';
import { getElasticsearchMetricQuery } from './metric_query';

interface Aggregation {
  aggregatedIntervals: {
    buckets: Array<{
      aggregatedValue: { value: number; values?: Array<{ key: number; value: number }> };
      doc_count: number;
      to_as_string: string;
      from_as_string: string;
      key_as_string: string;
    }>;
  };
}

interface CompositeAggregationsResponse {
  groupings: {
    buckets: Aggregation[];
  };
}

export interface EvaluatedAlertParams {
  criteria: MetricExpressionParams[];
  groupBy: string | undefined | string[];
  filterQuery: string | undefined;
  shouldDropPartialBuckets?: boolean;
}

export const evaluateAlert = <Params extends EvaluatedAlertParams = EvaluatedAlertParams>(
  esClient: ElasticsearchClient,
  params: Params,
  config: InfraSource['configuration'],
  timeframe?: { start: number; end: number }
) => {
  const { criteria, groupBy, filterQuery, shouldDropPartialBuckets } = params;
  return Promise.all(
    criteria.map(async (criterion) => {
      const currentValues = await getMetric(
        esClient,
        criterion,
        config.metricAlias,
        config.fields.timestamp,
        groupBy,
        filterQuery,
        timeframe,
        shouldDropPartialBuckets
      );

      const { threshold, warningThreshold, comparator, warningComparator } = criterion;
      const pointsEvaluator = (points: any[] | typeof NaN | null, t?: number[], c?: Comparator) => {
        if (!t || !c) return [false];
        const comparisonFunction = comparatorMap[c];
        return Array.isArray(points)
          ? points.map(
              (point) => t && typeof point.value === 'number' && comparisonFunction(point.value, t)
            )
          : [false];
      };

      return mapValues(currentValues, (points: any[] | typeof NaN | null) => {
        if (isTooManyBucketsPreviewException(points)) throw points;
        return {
          ...criterion,
          metric: criterion.metric ?? DOCUMENT_COUNT_I18N,
          currentValue: Array.isArray(points) ? last(points)?.value : NaN,
          timestamp: Array.isArray(points) ? last(points)?.key : NaN,
          shouldFire: pointsEvaluator(points, threshold, comparator),
          shouldWarn: pointsEvaluator(points, warningThreshold, warningComparator),
          isNoData: Array.isArray(points)
            ? points.map((point) => point?.value === null || point === null)
            : [points === null],
          isError: isNaN(Array.isArray(points) ? last(points)?.value : points),
        };
      });
    })
  );
};

const getMetric: (
  esClient: ElasticsearchClient,
  params: MetricExpressionParams,
  index: string,
  timefield: string,
  groupBy: string | undefined | string[],
  filterQuery: string | undefined,
  timeframe?: { start: number; end: number },
  shouldDropPartialBuckets?: boolean
) => Promise<Record<string, number[]>> = async function (
  esClient,
  params,
  index,
  timefield,
  groupBy,
  filterQuery,
  timeframe,
  shouldDropPartialBuckets
) {
  const { aggType, timeSize, timeUnit } = params;
  const hasGroupBy = groupBy && groupBy.length;

  const interval = `${timeSize}${timeUnit}`;
  const intervalAsSeconds = getIntervalInSeconds(interval);
  const intervalAsMS = intervalAsSeconds * 1000;

  const to = moment(timeframe ? timeframe.end : Date.now())
    .add(1, timeUnit)
    .startOf(timeUnit)
    .valueOf();

  // Rate aggregations need 5 buckets worth of data
  const minimumBuckets = aggType === Aggregators.RATE ? 5 : 1;

  const minimumFrom = to - intervalAsMS * minimumBuckets;

  const from = roundTimestamp(
    timeframe && timeframe.start <= minimumFrom ? timeframe.start : minimumFrom,
    timeUnit
  );

  const searchBody = getElasticsearchMetricQuery(
    params,
    timefield,
    { start: from, end: to },
    hasGroupBy ? groupBy : undefined,
    filterQuery
  );

  const dropPartialBucketsOptions =
    // Rate aggs always drop partial buckets; guard against this boolean being passed as false
    shouldDropPartialBuckets || aggType === Aggregators.RATE
      ? {
          from,
          to,
          bucketSizeInMillis: intervalAsMS,
        }
      : null;

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
        // @ts-expect-error @elastic/elasticsearch SearchResponse.body.timeout is not required
        (body) => esClient.search({ body, index }),
        searchBody,
        bucketSelector,
        afterKeyHandler
      )) as Array<Aggregation & { key: Record<string, string> }>;
      return compositeBuckets.reduce(
        (result, bucket) => ({
          ...result,
          [Object.values(bucket.key)
            .map((value) => value)
            .join(', ')]: getValuesFromAggregations(bucket, aggType, dropPartialBucketsOptions),
        }),
        {}
      );
    }
    const { body: result } = await esClient.search({
      body: searchBody,
      index,
    });

    return {
      [UNGROUPED_FACTORY_KEY]: getValuesFromAggregations(
        (result.aggregations! as unknown) as Aggregation,
        aggType,
        dropPartialBucketsOptions
      ),
    };
  } catch (e) {
    if (timeframe) {
      // This code should only ever be reached when previewing the alert, not executing it
      const causedByType = e.body?.error?.caused_by?.type;
      if (causedByType === 'too_many_buckets_exception') {
        return {
          [UNGROUPED_FACTORY_KEY]: {
            [TOO_MANY_BUCKETS_PREVIEW_EXCEPTION]: true,
            maxBuckets: e.body.error.caused_by.max_buckets,
          },
        };
      }
    }
    return { [UNGROUPED_FACTORY_KEY]: NaN }; // Trigger an Error state
  }
};

interface DropPartialBucketOptions {
  from: number;
  to: number;
  bucketSizeInMillis: number;
}

const dropPartialBuckets = ({ from, to, bucketSizeInMillis }: DropPartialBucketOptions) => (
  row: {
    key: string;
    value: number;
  } | null
) => {
  if (row == null) return null;
  const timestamp = new Date(row.key).valueOf();
  return timestamp >= from && timestamp + bucketSizeInMillis <= to;
};

const getValuesFromAggregations = (
  aggregations: Aggregation,
  aggType: MetricExpressionParams['aggType'],
  dropPartialBucketsOptions: DropPartialBucketOptions | null
) => {
  try {
    const { buckets } = aggregations.aggregatedIntervals;
    if (!buckets.length) return null; // No Data state

    let mappedBuckets;

    if (aggType === Aggregators.COUNT) {
      mappedBuckets = buckets.map((bucket) => ({
        key: bucket.from_as_string,
        value: bucket.doc_count,
      }));
    } else if (aggType === Aggregators.P95 || aggType === Aggregators.P99) {
      mappedBuckets = buckets.map((bucket) => {
        const values = bucket.aggregatedValue?.values || [];
        const firstValue = first(values);
        if (!firstValue) return null;
        return { key: bucket.from_as_string, value: firstValue.value };
      });
    } else if (aggType === Aggregators.AVERAGE) {
      mappedBuckets = buckets.map((bucket) => ({
        key: bucket.key_as_string ?? bucket.from_as_string,
        value: bucket.aggregatedValue?.value ?? null,
      }));
    } else if (aggType === Aggregators.RATE) {
      mappedBuckets = buckets.map((bucket) => ({
        key: bucket.key_as_string ?? bucket.from_as_string,
        value: bucket.aggregatedValue?.value ?? null,
      }));
    } else {
      mappedBuckets = buckets.map((bucket) => ({
        key: bucket.key_as_string ?? bucket.from_as_string,
        value: bucket.aggregatedValue?.value ?? null,
      }));
    }
    if (dropPartialBucketsOptions) {
      return mappedBuckets.filter(dropPartialBuckets(dropPartialBucketsOptions));
    }
    return mappedBuckets;
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
