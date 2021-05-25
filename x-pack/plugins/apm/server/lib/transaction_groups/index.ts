/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Setup, SetupTimeRange } from '../helpers/setup_request';
import { transactionGroupsFetcher, Options } from './fetcher';

export async function getTransactionGroupList(
  options: Options,
  setup: Setup & SetupTimeRange
) {
  const bucketSize = setup.config['xpack.apm.ui.transactionGroupBucketSize'];
  return await transactionGroupsFetcher(options, setup, bucketSize);
}
