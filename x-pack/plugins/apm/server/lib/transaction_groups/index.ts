/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Setup } from '../helpers/setup_request';
import { topTransactionGroupsFetcher, TopTraceOptions } from './fetcher';

export async function getTopTransactionGroupList(
  options: TopTraceOptions,
  setup: Setup
) {
  return await topTransactionGroupsFetcher(options, setup);
}
