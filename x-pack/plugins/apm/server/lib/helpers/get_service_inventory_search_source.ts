/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { APMEventClient } from './create_es_client/create_apm_event_client';
import { getSearchAggregatedTransactions } from './transactions';
import { getSearchAggregatedServiceMetrics } from './service_metrics';
import { APMConfig } from '../..';

export async function getServiceInventorySearchSource({
  config,
  apmEventClient,
  start,
  end,
  kuery,
}: {
  config: APMConfig;
  apmEventClient: APMEventClient;
  start: number;
  end: number;
  kuery: string;
}): Promise<{
  searchAggregatedTransactions: boolean;
  searchAggregatedServiceMetrics: boolean;
}> {
  const commonProps = {
    config,
    apmEventClient,
    kuery,
    start,
    end,
  };
  const [searchAggregatedTransactions, searchAggregatedServiceMetrics] =
    await Promise.all([
      getSearchAggregatedTransactions(commonProps),
      getSearchAggregatedServiceMetrics(commonProps),
    ]);

  return {
    searchAggregatedTransactions,
    searchAggregatedServiceMetrics,
  };
}
