/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Setup } from '../../../lib/helpers/setup_request';
import { getServiceDetailedStatsPeriods } from './get_service_transaction_detailed_statistics';
import { getServiceAggregatedDetailedStatsPeriods } from './get_service_aggregated_transaction_detailed_statistics';
import { RandomSampler } from '../../../lib/helpers/get_random_sampler';

export async function getServicesDetailedStatistics({
  serviceNames,
  environment,
  kuery,
  setup,
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
  setup: Setup;
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
    setup,
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
