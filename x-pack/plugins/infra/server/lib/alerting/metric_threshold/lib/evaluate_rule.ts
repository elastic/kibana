/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import moment from 'moment';
import { difference, first, has, isNaN, isNumber, isObject, last, mapValues } from 'lodash';
import {
  Aggregators,
  Comparator,
  isTooManyBucketsPreviewException,
  MetricExpressionParams,
  TOO_MANY_BUCKETS_PREVIEW_EXCEPTION,
} from '../../../../../common/alerting/metrics';
import { InfraSource } from '../../../../../common/source_configuration/source_configuration';
import { createAfterKeyHandler } from '../../../../utils/create_afterkey_handler';
import { getAllCompositeData } from '../../../../utils/get_all_composite_data';
import { getIntervalInSeconds } from '../../../../utils/get_interval_in_seconds';
import { InfraDatabaseSearchResponse } from '../../../adapters/framework/adapter_types';
import { DOCUMENT_COUNT_I18N } from '../../common/messages';
import { UNGROUPED_FACTORY_KEY } from '../../common/utils';
import { createTimerange } from './create_timerange';
import { getElasticsearchMetricQuery } from './metric_query';

interface AggregationWithoutIntervals {
  aggregatedValue: { value: number; values?: Array<{ key: number; value: number }> };
}

interface AggregationWithIntervals {
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

type Aggregation = AggregationWithIntervals | AggregationWithoutIntervals;

function isAggregationWithIntervals(
  subject: Aggregation | undefined
): subject is AggregationWithIntervals {
  return isObject(subject) && has(subject, 'aggregatedIntervals');
}

interface CompositeAggregationsResponse {
  groupings: {
    buckets: Aggregation[];
  };
}

export interface EvaluatedRuleParams {
  criteria: MetricExpressionParams[];
  groupBy: string | undefined | string[];
  filterQuery?: string;
  filterQueryText?: string;
  shouldDropPartialBuckets?: boolean;
}

export const evaluateRule = <Params extends EvaluatedRuleParams = EvaluatedRuleParams>(
  esClient: ElasticsearchClient,
  params: Params,
  config: InfraSource['configuration'],
  prevGroups: string[],
  compositeSize: number,
  timeframe?: { start?: number; end: number }
) => {
  const { criteria, groupBy, filterQuery, shouldDropPartialBuckets } = params;

  return Promise.all(
    criteria.map(async (criterion) => {
      const currentValues = await getMetric(
        esClient,
        criterion,
        config.metricAlias,
        groupBy,
        filterQuery,
        compositeSize,
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

      // If any previous groups are no longer being reported, backfill them with null values
      const currentGroups = Object.keys(currentValues);

      const missingGroups = difference(prevGroups, currentGroups);

      if (currentGroups.length === 0 && missingGroups.length === 0) {
        missingGroups.push(UNGROUPED_FACTORY_KEY);
      }
      const backfillTimestamp =
        last(last(Object.values(currentValues)))?.key ?? new Date().toISOString();
      const backfilledPrevGroups: Record<string, Array<{ key: string; value: number | null }>> = {};
      for (const group of missingGroups) {
        backfilledPrevGroups[group] = [
          {
            key: backfillTimestamp,
            value: criterion.aggType === Aggregators.COUNT ? 0 : null,
          },
        ];
      }
      const currentValuesWithBackfilledPrevGroups = {
        ...currentValues,
        ...backfilledPrevGroups,
      };

      return mapValues(
        currentValuesWithBackfilledPrevGroups,
        (points: any[] | typeof NaN | null) => {
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
        }
      );
    })
  );
};

const getMetric: (
  esClient: ElasticsearchClient,
  params: MetricExpressionParams,
  index: string,
  groupBy: string | undefined | string[],
  filterQuery: string | undefined,
  compositeSize: number,
  timeframe?: { start?: number; end: number },
  shouldDropPartialBuckets?: boolean
) => Promise<Record<string, Array<{ key: string; value: number }>>> = async function (
  esClient,
  params,
  index,
  groupBy,
  filterQuery,
  compositeSize,
  timeframe,
  shouldDropPartialBuckets
) {
  const { aggType, timeSize, timeUnit } = params;
  const hasGroupBy = groupBy && groupBy.length;

  const interval = `${timeSize}${timeUnit}`;
  const intervalAsSeconds = getIntervalInSeconds(interval);
  const intervalAsMS = intervalAsSeconds * 1000;
  const calculatedTimerange = createTimerange(intervalAsMS, aggType, timeframe);

  const searchBody = getElasticsearchMetricQuery(
    params,
    calculatedTimerange,
    compositeSize,
    hasGroupBy ? groupBy : undefined,
    filterQuery
  );

  const dropPartialBucketsOptions =
    // Rate aggs always drop partial buckets; guard against this boolean being passed as false
    shouldDropPartialBuckets || aggType === Aggregators.RATE
      ? {
          from: calculatedTimerange.start,
          to: calculatedTimerange.end,
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
        (body) => esClient.search({ body, index }, { meta: true }),
        searchBody,
        bucketSelector,
        afterKeyHandler
      )) as Array<Aggregation & { key: Record<string, string>; doc_count: number }>;
      const groupedResults: Record<string, any> = {};
      for (const bucket of compositeBuckets) {
        const key = Object.values(bucket.key).join(', ');
        const value = getValuesFromAggregations(
          bucket,
          aggType,
          dropPartialBucketsOptions,
          calculatedTimerange,
          bucket.doc_count
        );
        groupedResults[key] = value;
      }
      return groupedResults;
    }
    const result = await esClient.search({
      body: searchBody,
      index,
    });

    return {
      [UNGROUPED_FACTORY_KEY]: getValuesFromAggregations(
        result.aggregations! as unknown as Aggregation,
        aggType,
        dropPartialBucketsOptions,
        calculatedTimerange,
        result.hits
          ? isNumber(result.hits.total)
            ? result.hits.total
            : result.hits.total?.value ?? 0
          : 0
      ),
    };
  } catch (e: any) {
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

const dropPartialBuckets =
  ({ from, to, bucketSizeInMillis }: DropPartialBucketOptions) =>
  (
    row: {
      key: string;
      value: number | null;
    } | null
  ) => {
    if (row == null) return null;
    const timestamp = new Date(row.key).valueOf();
    return timestamp >= from && timestamp + bucketSizeInMillis <= to;
  };

const getValuesFromAggregations = (
  aggregations: Aggregation | undefined,
  aggType: MetricExpressionParams['aggType'],
  dropPartialBucketsOptions: DropPartialBucketOptions | null,
  timeFrame: { start: number; end: number },
  docCount?: number
) => {
  try {
    let buckets;
    if (aggType === Aggregators.COUNT) {
      buckets = [
        {
          doc_count: docCount,
          to_as_string: moment(timeFrame.end).toISOString(),
          from_as_string: moment(timeFrame.start).toISOString(),
          key_as_string: moment(timeFrame.start).toISOString(),
        },
      ];
    } else if (isAggregationWithIntervals(aggregations)) {
      buckets = aggregations.aggregatedIntervals.buckets;
    } else {
      buckets = [
        {
          ...aggregations,
          doc_count: docCount,
          to_as_string: moment(timeFrame.end).toISOString(),
          from_as_string: moment(timeFrame.start).toISOString(),
          key_as_string: moment(timeFrame.start).toISOString(),
        },
      ];
    }

    if (!buckets.length) return null; // No Data state

    let mappedBuckets: Array<{ key: string; value: number | null } | null>;

    if (aggType === Aggregators.COUNT) {
      mappedBuckets = buckets.map((bucket) => ({
        key: bucket.from_as_string,
        value: bucket.doc_count || null,
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
