/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSearchAggregatedTransactions } from '.';
import { APMConfig } from '../../..';
import { SearchAggregatedTransactionSetting } from '../../../../common/aggregated_transactions';
import { APMEventClient } from '../create_es_client/create_apm_event_client';

export async function getFallbackToTransactions(options: {
  config: APMConfig;
  start?: number;
  end?: number;
  apmEventClient: APMEventClient;
  kuery?: string;
}): Promise<boolean> {
  const { config } = options;
  const searchAggregatedTransactions =
    config['xpack.apm.searchAggregatedTransactions'];
  const forceSearchRawTransactions =
    searchAggregatedTransactions === SearchAggregatedTransactionSetting.never;

  if (forceSearchRawTransactions) {
    return false;
  }

  const searchesAggregatedTransactions = await getSearchAggregatedTransactions(
    options
  );
  return !searchesAggregatedTransactions;
}
