/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isNumber, round, sortBy } from 'lodash';
import mean from 'lodash.mean';
import { oc } from 'ts-optchain';
import { IAvgAnomaliesResponse } from '../get_avg_response_time_anomalies';
import { ESResponse } from './fetcher';

type MaybeNumber = number | null;

export interface TimeSeriesAPIResponse {
  totalHits: number;
  dates: number[];
  responseTimes: {
    avg: MaybeNumber[];
    p95: MaybeNumber[];
    p99: MaybeNumber[];
    avgAnomalies?: IAvgAnomaliesResponse;
  };
  tpmBuckets: Array<{
    key: string;
    avg: number;
    values: number[];
  }>;
  overallAvgDuration?: number;
}

export function timeseriesTransformer({
  timeseriesResponse,
  avgAnomaliesResponse,
  bucketSize
}: {
  timeseriesResponse: ESResponse;
  avgAnomaliesResponse: IAvgAnomaliesResponse;
  bucketSize: number;
}): TimeSeriesAPIResponse {
  const aggs = timeseriesResponse.aggregations;
  const overallAvgDuration = oc(aggs).overall_avg_duration.value();

  const responseTimeBuckets = oc(aggs)
    .response_times.buckets([])
    .slice(1, -1);
  const dates = responseTimeBuckets.map(bucket => bucket.key);
  const { avg, p95, p99 } = getResponseTime(responseTimeBuckets);

  const transactionResultBuckets = oc(aggs).transaction_results.buckets([]);
  const tpmBuckets = getTpmBuckets(transactionResultBuckets, bucketSize);

  return {
    totalHits: timeseriesResponse.hits.total,
    dates,
    responseTimes: {
      avg,
      p95,
      p99,
      avgAnomalies: avgAnomaliesResponse
    },
    tpmBuckets,
    overallAvgDuration
  };
}

export function getTpmBuckets(
  transactionResultBuckets: ESResponse['aggregations']['transaction_results']['buckets'],
  bucketSize: number
) {
  const buckets = transactionResultBuckets.map(({ key, timeseries }) => {
    const tpmValues = timeseries.buckets
      .slice(1, -1)
      .map(bucket => round(bucket.doc_count * (60 / bucketSize), 1));

    return {
      key,
      avg: mean(tpmValues),
      values: tpmValues
    };
  });

  return sortBy(
    buckets,
    bucket => bucket.key.replace(/^HTTP (\d)xx$/, '00$1') // ensure that HTTP 3xx are sorted at the top
  );
}

function getResponseTime(
  responseTimeBuckets: ESResponse['aggregations']['response_times']['buckets']
) {
  return responseTimeBuckets.reduce(
    (acc, bucket) => {
      const { '95.0': p95, '99.0': p99 } = bucket.pct.values;

      acc.avg.push(bucket.avg.value);
      acc.p95.push(isNumber(p95) ? p95 : null);
      acc.p99.push(isNumber(p99) ? p99 : null);
      return acc;
    },
    {
      avg: [] as MaybeNumber[],
      p95: [] as MaybeNumber[],
      p99: [] as MaybeNumber[]
    }
  );
}
