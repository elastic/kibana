/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Setup, SetupTimeRange } from '../../helpers/setup_request';
import { getBuckets } from './get_buckets';
import { getDistributionMax } from './get_distribution_max';
import { roundToNearestFiveOrTen } from '../../helpers/round_to_nearest_five_or_ten';
import { MINIMUM_BUCKET_SIZE, BUCKET_TARGET_COUNT } from '../constants';
import { withApmSpan } from '../../../utils/with_apm_span';

function getBucketSize(max: number) {
  const bucketSize = max / BUCKET_TARGET_COUNT;
  return roundToNearestFiveOrTen(
    bucketSize > MINIMUM_BUCKET_SIZE ? bucketSize : MINIMUM_BUCKET_SIZE
  );
}

export async function getTransactionDistribution({
  environment,
  serviceName,
  transactionName,
  transactionType,
  transactionId,
  traceId,
  setup,
  searchAggregatedTransactions,
}: {
  environment?: string;
  serviceName: string;
  transactionName: string;
  transactionType: string;
  transactionId: string;
  traceId: string;
  setup: Setup & SetupTimeRange;
  searchAggregatedTransactions: boolean;
}) {
  return withApmSpan('get_transaction_latency_distribution', async () => {
    const distributionMax = await getDistributionMax({
      environment,
      serviceName,
      transactionName,
      transactionType,
      setup,
      searchAggregatedTransactions,
    });

    if (distributionMax == null) {
      return { noHits: true, buckets: [], bucketSize: 0 };
    }

    const bucketSize = getBucketSize(distributionMax);

    const { buckets, noHits } = await getBuckets({
      environment,
      serviceName,
      transactionName,
      transactionType,
      transactionId,
      traceId,
      distributionMax,
      bucketSize,
      setup,
      searchAggregatedTransactions,
    });

    return {
      noHits,
      buckets,
      bucketSize,
    };
  });
}
