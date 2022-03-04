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
import { mergeServiceStats } from './merge_service_stats';

export type ServicesItemsSetup = Setup;

const MAX_NUMBER_OF_SERVICES = 500;

export async function getServicesItems({
  environment,
  kuery,
  setup,
  searchAggregatedTransactions,
  logger,
  start,
  end,
}: {
  environment: string;
  kuery: string;
  setup: ServicesItemsSetup;
  searchAggregatedTransactions: boolean;
  logger: Logger;
  start: number;
  end: number;
}) {
  return withApmSpan('get_services_items', async () => {
    const params = {
      environment,
      kuery,
      setup,
      searchAggregatedTransactions,
      maxNumServices: MAX_NUMBER_OF_SERVICES,
      start,
      end,
    };

    const [
      transactionStats,
      servicesFromErrorAndMetricDocuments,
      healthStatuses,
    ] = await Promise.all([
      getServiceTransactionStats(params),
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
