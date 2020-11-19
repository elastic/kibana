/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Setup, SetupTimeRange } from '../helpers/setup_request';

export async function getThroughput({
  searchAggregatedTransactions,
  serviceName,
  setup,
  transactionType,
}: {
  searchAggregatedTransactions: boolean;
  serviceName: string;
  setup: Setup & SetupTimeRange;
  transactionType: string;
}) {
  return {
    average: null,
    noHits: true,
    throughput: [],
  };
}
