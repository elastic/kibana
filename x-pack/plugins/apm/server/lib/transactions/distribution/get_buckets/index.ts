/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Setup } from '../../../helpers/setup_request';
import { bucketFetcher } from './fetcher';
import { bucketTransformer } from './transform';

export async function getBuckets(
  serviceName: string,
  transactionName: string,
  transactionType: string,
  transactionId: string,
  traceId: string,
  bucketSize: number,
  setup: Setup
) {
  const response = await bucketFetcher(
    serviceName,
    transactionName,
    transactionType,
    transactionId,
    traceId,
    bucketSize,
    setup
  );

  return bucketTransformer(response);
}
