/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isNumber, round, sortBy } from 'lodash';
import { idx } from '@kbn/elastic-idx';
import { NOT_AVAILABLE_LABEL } from '../../../../../common/i18n';
import { Coordinate } from '../../../../../typings/timeseries';
import { ESResponse } from './fetcher';

export interface ApmTimeSeriesResponse {
  totalHits: number;
  responseTimes: {
    avg: Coordinate[];
    p95: Coordinate[];
    p99: Coordinate[];
  };
  tpmBuckets: Array<{
    key: string;
    dataPoints: Coordinate[];
  }>;
  overallAvgDuration?: number;
}

export function timeseriesTransformer({
  timeseriesResponse,
  bucketSize
}: {
  timeseriesResponse: ESResponse;
  bucketSize: number;
}): ApmTimeSeriesResponse {
  const aggs = timeseriesResponse.aggregations;
  const overallAvgDuration = idx(aggs, _ => _.overall_avg_duration.value);
  const responseTimeBuckets = idx(aggs, _ => _.response_times.buckets);
  const { avg, p95, p99 } = getResponseTime(responseTimeBuckets);
  const transactionResultBuckets = idx(
    aggs,
    _ => _.transaction_results.buckets
  );
  const tpmBuckets = getTpmBuckets(transactionResultBuckets, bucketSize);

  return {
    totalHits: timeseriesResponse.hits.total,
    responseTimes: {
      avg,
      p95,
      p99
    },
    tpmBuckets,
    overallAvgDuration
  };
}

export function getTpmBuckets(
  transactionResultBuckets: ESResponse['aggregations']['transaction_results']['buckets'] = [],
  bucketSize: number
) {
  const buckets = transactionResultBuckets.map(
    ({ key: resultKey, timeseries }) => {
      const dataPoints = timeseries.buckets.map(bucket => {
        return {
          x: bucket.key,
          y: round(bucket.doc_count * (60 / bucketSize), 1)
        };
      });

      // Handle empty string result keys
      const key = resultKey === '' ? NOT_AVAILABLE_LABEL : resultKey;

      return { key, dataPoints };
    }
  );

  return sortBy(
    buckets,
    bucket => bucket.key.replace(/^HTTP (\d)xx$/, '00$1') // ensure that HTTP 3xx are sorted at the top
  );
}

function getResponseTime(
  responseTimeBuckets: ESResponse['aggregations']['response_times']['buckets'] = []
) {
  return responseTimeBuckets.reduce(
    (acc, bucket) => {
      const { '95.0': p95, '99.0': p99 } = bucket.pct.values;

      acc.avg.push({ x: bucket.key, y: bucket.avg.value });
      acc.p95.push({ x: bucket.key, y: isNumber(p95) ? p95 : null });
      acc.p99.push({ x: bucket.key, y: isNumber(p99) ? p99 : null });
      return acc;
    },
    {
      avg: [] as Coordinate[],
      p95: [] as Coordinate[],
      p99: [] as Coordinate[]
    }
  );
}
