/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { first, last } from 'lodash';
import { Coordinate, RectCoordinate } from '../../../../../typings/timeseries';
import { ESResponse } from './fetcher';

type IBucket = ReturnType<typeof getBucket>;
function getBucket(
  bucket: Required<
    ESResponse
  >['aggregations']['ml_avg_response_times']['buckets'][0]
) {
  return {
    x: bucket.key,
    anomalyScore: bucket.anomaly_score.value,
    lower: bucket.lower.value,
    upper: bucket.upper.value,
  };
}

export type AnomalyTimeSeriesResponse = ReturnType<
  typeof anomalySeriesTransform
>;
export function anomalySeriesTransform(
  response: ESResponse,
  mlBucketSize: number,
  bucketSize: number,
  timeSeriesDates: number[],
  jobId: string
) {
  const buckets =
    response.aggregations?.ml_avg_response_times.buckets.map(getBucket) || [];

  const bucketSizeInMillis = Math.max(bucketSize, mlBucketSize) * 1000;

  return {
    jobId,
    anomalyScore: getAnomalyScoreDataPoints(
      buckets,
      timeSeriesDates,
      bucketSizeInMillis
    ),
    anomalyBoundaries: getAnomalyBoundaryDataPoints(buckets, timeSeriesDates),
  };
}

export function getAnomalyScoreDataPoints(
  buckets: IBucket[],
  timeSeriesDates: number[],
  bucketSizeInMillis: number
): RectCoordinate[] {
  const ANOMALY_THRESHOLD = 75;
  const firstDate = first(timeSeriesDates);
  const lastDate = last(timeSeriesDates);

  if (firstDate === undefined || lastDate === undefined) {
    return [];
  }

  return buckets
    .filter(
      (bucket) =>
        bucket.anomalyScore !== null && bucket.anomalyScore > ANOMALY_THRESHOLD
    )
    .filter(isInDateRange(firstDate, lastDate))
    .map((bucket) => {
      return {
        x0: bucket.x,
        x: Math.min(bucket.x + bucketSizeInMillis, lastDate), // don't go beyond last date
      };
    });
}

export function getAnomalyBoundaryDataPoints(
  buckets: IBucket[],
  timeSeriesDates: number[]
): Coordinate[] {
  return replaceFirstAndLastBucket(buckets, timeSeriesDates)
    .filter((bucket) => bucket.lower !== null)
    .map((bucket) => {
      return {
        x: bucket.x,
        y0: bucket.lower,
        y: bucket.upper,
      };
    });
}

export function replaceFirstAndLastBucket(
  buckets: IBucket[],
  timeSeriesDates: number[]
) {
  const firstDate = first(timeSeriesDates);
  const lastDate = last(timeSeriesDates);

  if (firstDate === undefined || lastDate === undefined) {
    return buckets;
  }

  const preBucketWithValue = buckets
    .filter((p) => p.x <= firstDate)
    .reverse()
    .find((p) => p.lower !== null);

  const bucketsInRange = buckets.filter(isInDateRange(firstDate, lastDate));

  // replace first bucket if it is null
  const firstBucket = first(bucketsInRange);
  if (preBucketWithValue && firstBucket && firstBucket.lower === null) {
    firstBucket.lower = preBucketWithValue.lower;
    firstBucket.upper = preBucketWithValue.upper;
  }

  const lastBucketWithValue = [...buckets]
    .reverse()
    .find((p) => p.lower !== null);

  // replace last bucket if it is null
  const lastBucket = last(bucketsInRange);
  if (lastBucketWithValue && lastBucket && lastBucket.lower === null) {
    lastBucket.lower = lastBucketWithValue.lower;
    lastBucket.upper = lastBucketWithValue.upper;
  }

  return bucketsInRange;
}

// anomaly time series contain one or more buckets extra in the beginning
// these extra buckets should be removed
function isInDateRange(firstDate: number, lastDate: number) {
  return (p: IBucket) => p.x >= firstDate && p.x <= lastDate;
}
