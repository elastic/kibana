/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getBucketWithInitialAnomalyBounds } from '../get_buckets_with_initial_anomaly_bounds';
import mainBucketsResponse from './mockData/mainBucketsResponse';
import firstBucketsResponse from './mockData/firstBucketsResponse';

describe('get_buckets_with_initial_anomaly_bounds', () => {
  const mainBuckets =
    mainBucketsResponse.aggregations.ml_avg_response_times.buckets;
  let buckets;

  beforeEach(async () => {
    buckets = await getBucketWithInitialAnomalyBounds({
      serviceName: 'myServiceName',
      transactionType: 'myTransactionType',
      intervalString: '60s',
      start: 1530523322742,
      client: () => firstBucketsResponse,
      mainBuckets,
      anomalyBucketSpan: 900
    });
  });

  it('should return correct buckets', () => {
    expect(buckets).toMatchSnapshot();
  });

  it('should not change the number of buckets', () => {
    expect(mainBuckets.length).toEqual(buckets.length);
  });

  it('should replace the first bucket but leave all other buckets the same', () => {
    buckets.forEach((bucket, i) => {
      if (i === 0) {
        expect(mainBuckets[0]).not.toEqual(bucket);
      } else {
        expect(mainBuckets[i]).toBe(bucket);
      }
    });
  });
});
