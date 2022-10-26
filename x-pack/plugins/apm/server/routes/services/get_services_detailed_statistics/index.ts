/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getServiceDetailedStatsPeriods } from './get_service_transaction_detailed_statistics';
import { getServiceAggregatedDetailedStatsPeriods } from './get_service_aggregated_transaction_detailed_statistics';
import { RandomSampler } from '../../../lib/helpers/get_random_sampler';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';

export async function getServicesDetailedStatistics({
  serviceNames,
  environment,
  kuery,
  apmEventClient,
  searchAggregatedTransactions,
  searchAggregatedServiceMetrics,
  offset,
  start,
  end,
  randomSampler,
}: {
  serviceNames: string[];
  environment: string;
  kuery: string;
  apmEventClient: APMEventClient;
  searchAggregatedTransactions: boolean;
  searchAggregatedServiceMetrics: boolean;
  offset?: string;
  start: number;
  end: number;
  randomSampler: RandomSampler;
}) {
  const commonProps = {
    serviceNames,
    environment,
    kuery,
    apmEventClient,
    start,
    end,
    randomSampler,
    offset,
  };
  return searchAggregatedServiceMetrics
    ? getServiceAggregatedDetailedStatsPeriods({
        ...commonProps,
        searchAggregatedServiceMetrics,
      })
    : getServiceDetailedStatsPeriods({
        ...commonProps,
        searchAggregatedTransactions,
      });
}
