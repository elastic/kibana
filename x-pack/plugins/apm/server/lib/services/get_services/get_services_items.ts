/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import { joinByKey } from '../../../../common/utils/join_by_key';
import { getServicesProjection } from '../../../projections/services';
import { withApmSpan } from '../../../utils/with_apm_span';
import { Setup, SetupTimeRange } from '../../helpers/setup_request';
import { getHealthStatuses } from './get_health_statuses';
import { getServiceTransactionStats } from './get_service_transaction_stats';

export type ServicesItemsSetup = Setup & SetupTimeRange;

export async function getServicesItems({
  environment,
  setup,
  searchAggregatedTransactions,
  logger,
}: {
  environment?: string;
  setup: ServicesItemsSetup;
  searchAggregatedTransactions: boolean;
  logger: Logger;
}) {
  return withApmSpan('get_services_items', async () => {
    const params = {
      environment,
      projection: getServicesProjection({
        setup,
        searchAggregatedTransactions,
      }),
      setup,
      searchAggregatedTransactions,
    };

    const [transactionStats, healthStatuses] = await Promise.all([
      getServiceTransactionStats(params),
      getHealthStatuses(params).catch((err) => {
        logger.error(err);
        return [];
      }),
    ]);

    const apmServices = transactionStats.map(({ serviceName }) => serviceName);

    // make sure to exclude health statuses from services
    // that are not found in APM data
    const matchedHealthStatuses = healthStatuses.filter(({ serviceName }) =>
      apmServices.includes(serviceName)
    );

    const allMetrics = [...transactionStats, ...matchedHealthStatuses];

    return joinByKey(allMetrics, 'serviceName');
  });
}
