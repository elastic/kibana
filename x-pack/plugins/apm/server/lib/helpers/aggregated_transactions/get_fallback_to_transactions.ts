/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSearchAggregatedTransactions } from '.';
import { SearchAggregatedTransactionSetting } from '../../../../common/aggregated_transactions';
import { Setup, SetupTimeRange } from '../setup_request';

export async function getFallbackToTransactions({
  setup: { config, start, end, apmEventClient },
  kuery,
}: {
  setup: Setup & Partial<SetupTimeRange>;
  kuery: string;
}): Promise<boolean> {
  const searchAggregatedTransactions =
    config['xpack.apm.searchAggregatedTransactions'];
  const neverSearchAggregatedTransactions =
    searchAggregatedTransactions === SearchAggregatedTransactionSetting.never;

  if (neverSearchAggregatedTransactions) {
    return false;
  }

  const searchesAggregatedTransactions = await getSearchAggregatedTransactions({
    config,
    start,
    end,
    apmEventClient,
    kuery,
  });
  return !searchesAggregatedTransactions;
}
