/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, isEmpty } from 'lodash';
import { getBuckets } from './get_buckets';
import { calculateBucketSize } from './calculate_bucket_size';

function getDefaultTransactionId(buckets) {
  const filledBuckets = buckets.filter(
    bucket => bucket.count && bucket.sampled
  );

  if (isEmpty(filledBuckets)) {
    return;
  }

  const middleIndex = Math.floor(filledBuckets.length / 2);
  return get(filledBuckets, `[${middleIndex}].transaction_id`);
}

export async function getDistribution({ serviceName, transactionName, setup }) {
  const bucketSize = await calculateBucketSize({
    serviceName,
    transactionName,
    setup
  });
  const { buckets, total_hits: totalHits } = await getBuckets({
    serviceName,
    transactionName,
    setup,
    bucketSize
  });

  return {
    total_hits: totalHits,
    buckets,
    bucket_size: bucketSize,
    default_transaction_id: getDefaultTransactionId(buckets)
  };
}
