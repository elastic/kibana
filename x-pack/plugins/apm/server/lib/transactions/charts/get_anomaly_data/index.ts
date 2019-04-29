/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getBucketSize } from '../../../helpers/get_bucket_size';
import { Setup } from '../../../helpers/setup_request';
import { anomalySeriesFetcher } from './fetcher';
import { getMlBucketSize } from './get_ml_bucket_size';
import { anomalySeriesTransform } from './transform';

export async function getAnomalySeries({
  serviceName,
  transactionType,
  transactionName,
  timeSeriesDates,
  setup
}: {
  serviceName: string;
  transactionType?: string;
  transactionName?: string;
  timeSeriesDates: number[];
  setup: Setup;
}) {
  // don't fetch anomalies for transaction details page
  if (transactionName) {
    return;
  }

  // don't fetch anomalies without a type
  if (!transactionType) {
    return;
  }

  // don't fetch anomalies if kuery filter is applied
  if (setup.esFilterQuery) {
    return;
  }

  const mlBucketSize = await getMlBucketSize({
    serviceName,
    transactionType,
    setup
  });

  const { start, end } = setup;
  const { intervalString, bucketSize } = getBucketSize(start, end, 'auto');

  const esResponse = await anomalySeriesFetcher({
    serviceName,
    transactionType,
    intervalString,
    mlBucketSize,
    setup
  });

  return anomalySeriesTransform(
    esResponse,
    mlBucketSize,
    bucketSize,
    timeSeriesDates
  );
}
