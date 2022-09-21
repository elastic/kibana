/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import { withApmSpan } from '../../../utils/with_apm_span';
import { Setup } from '../../../lib/helpers/setup_request';
import { getHealthStatuses } from './get_health_statuses';
import { getServicesFromErrorAndMetricDocuments } from './get_services_from_error_and_metric_documents';
import { getServiceTransactionStats } from './get_service_transaction_stats';
import { getServiceAggregatedTransactionStats } from './get_service_aggregated_transaction_stats';
import { mergeServiceStats } from './merge_service_stats';
import { ServiceGroup } from '../../../../common/service_groups';
import { RandomSampler } from '../../../lib/helpers/get_random_sampler';

export type ServicesItemsSetup = Setup;

const MAX_NUMBER_OF_SERVICES = 500;

export async function getServicesItems({
  environment,
  kuery,
  setup,
  searchAggregatedTransactions,
  searchAggregatedServiceMetrics,
  logger,
  start,
  end,
  serviceGroup,
  randomSampler,
}: {
  environment: string;
  kuery: string;
  setup: ServicesItemsSetup;
  searchAggregatedTransactions: boolean;
  searchAggregatedServiceMetrics: boolean;
  logger: Logger;
  start: number;
  end: number;
  serviceGroup: ServiceGroup | null;
  randomSampler: RandomSampler;
}) {
  return withApmSpan('get_services_items', async () => {
    const params = {
      environment,
      kuery,
      setup,
      searchAggregatedTransactions,
      searchAggregatedServiceMetrics,
      maxNumServices: MAX_NUMBER_OF_SERVICES,
      start,
      end,
      serviceGroup,
      randomSampler,
    };

    const [
      transactionStats,
      servicesFromErrorAndMetricDocuments,
      healthStatuses,
    ] = await Promise.all([
      searchAggregatedServiceMetrics
        ? getServiceAggregatedTransactionStats(params)
        : getServiceTransactionStats(params),
      getServicesFromErrorAndMetricDocuments(params),
      getHealthStatuses(params).catch((err) => {
        logger.error(err);
        return [];
      }),
    ]);

    return mergeServiceStats({
      transactionStats,
      servicesFromErrorAndMetricDocuments,
      healthStatuses,
    });
  });
}
