/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import { asMutableArray } from '../../../../common/utils/as_mutable_array';
import { joinByKey } from '../../../../common/utils/join_by_key';
import { withApmSpan } from '../../../utils/with_apm_span';
import { Setup, SetupTimeRange } from '../../helpers/setup_request';
import { getHealthStatuses } from './get_health_statuses';
import { getServicesFromMetricDocuments } from './get_services_from_metric_documents';
import { getServiceTransactionStats } from './get_service_transaction_stats';

export type ServicesItemsSetup = Setup & SetupTimeRange;

const MAX_NUMBER_OF_SERVICES = 500;

export async function getServicesItems({
  environment,
  kuery,
  setup,
  searchAggregatedTransactions,
  logger,
}: {
  environment?: string;
  kuery?: string;
  setup: ServicesItemsSetup;
  searchAggregatedTransactions: boolean;
  logger: Logger;
}) {
  return withApmSpan('get_services_items', async () => {
    const params = {
      environment,
      kuery,
      setup,
      searchAggregatedTransactions,
      maxNumServices: MAX_NUMBER_OF_SERVICES,
    };

    const [
      transactionStats,
      servicesFromMetricDocuments,
      healthStatuses,
    ] = await Promise.all([
      getServiceTransactionStats(params),
      getServicesFromMetricDocuments(params),
      getHealthStatuses(params).catch((err) => {
        logger.error(err);
        return [];
      }),
    ]);

    const foundServiceNames = transactionStats.map(
      ({ serviceName }) => serviceName
    );

    const servicesWithOnlyMetricDocuments = servicesFromMetricDocuments.filter(
      ({ serviceName }) => !foundServiceNames.includes(serviceName)
    );

    const allServiceNames = foundServiceNames.concat(
      servicesWithOnlyMetricDocuments.map(({ serviceName }) => serviceName)
    );

    // make sure to exclude health statuses from services
    // that are not found in APM data
    const matchedHealthStatuses = healthStatuses.filter(({ serviceName }) =>
      allServiceNames.includes(serviceName)
    );

    return joinByKey(
      asMutableArray([
        ...transactionStats,
        ...servicesWithOnlyMetricDocuments,
        ...matchedHealthStatuses,
      ] as const),
      'serviceName'
    );
  });
}
