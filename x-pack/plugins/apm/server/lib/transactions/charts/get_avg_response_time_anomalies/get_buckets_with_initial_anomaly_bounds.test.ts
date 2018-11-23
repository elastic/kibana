/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getAnomalyAggs } from './get_anomaly_aggs';
import { AvgAnomalyBucket } from './get_anomaly_aggs/transform';
import { getBucketWithInitialAnomalyBounds } from './get_buckets_with_initial_anomaly_bounds';
import { firstBucketsResponse } from './mock-responses/firstBucketsResponse';
import { mainBucketsResponse } from './mock-responses/mainBucketsResponse';

describe('get_buckets_with_initial_anomaly_bounds', () => {
  let buckets: AvgAnomalyBucket[];
  let mainBuckets: AvgAnomalyBucket[];

  beforeEach(async () => {
    const response = await getAnomalyAggs({
      serviceName: 'myServiceName',
      transactionType: 'myTransactionType',
      intervalString: '',
      client: () => mainBucketsResponse as any,
      start: 0,
      end: 1
    });

    mainBuckets = response!.buckets;
    buckets = await getBucketWithInitialAnomalyBounds({
      serviceName: 'myServiceName',
      transactionType: 'myTransactionType',
      start: 1530523322742,
      client: () => firstBucketsResponse as any,
      buckets: mainBuckets,
      bucketSize: 900
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
