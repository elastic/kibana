/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Logger } from '@kbn/logging';
import { PromiseReturnType } from '../../../../../observability/typings/common';
import { joinByKey } from '../../../../common/utils/join_by_key';
import { getServicesProjection } from '../../../projections/services';
import { Setup, SetupTimeRange } from '../../helpers/setup_request';
import {
  getAgentNames,
  getEnvironments,
  getHealthStatuses,
  getTransactionDurationAverages,
  getTransactionErrorRates,
  getTransactionRates,
} from './get_services_items_stats';

export type ServiceListAPIResponse = PromiseReturnType<typeof getServicesItems>;
export type ServicesItemsSetup = Setup & SetupTimeRange;
export type ServicesItemsProjection = ReturnType<typeof getServicesProjection>;

export async function getServicesItems({
  setup,
  searchAggregatedTransactions,
  logger,
}: {
  setup: ServicesItemsSetup;
  searchAggregatedTransactions: boolean;
  logger: Logger;
}) {
  const params = {
    projection: getServicesProjection({
      setup,
      searchAggregatedTransactions,
    }),
    setup,
    searchAggregatedTransactions,
  };

  const [
    transactionDurationAverages,
    agentNames,
    transactionRates,
    transactionErrorRates,
    environments,
    healthStatuses,
  ] = await Promise.all([
    getTransactionDurationAverages(params),
    getAgentNames(params),
    getTransactionRates(params),
    getTransactionErrorRates(params),
    getEnvironments(params),
    getHealthStatuses(params, setup.uiFilters.environment).catch((err) => {
      logger.error(err);
      return [];
    }),
  ]);

  const apmServiceMetrics = joinByKey(
    [
      ...transactionDurationAverages,
      ...agentNames,
      ...transactionRates,
      ...transactionErrorRates,
      ...environments,
    ],
    'serviceName'
  );

  const apmServices = apmServiceMetrics.map(({ serviceName }) => serviceName);

  // make sure to exclude health statuses from services
  // that are not found in APM data

  const matchedHealthStatuses = healthStatuses.filter(({ serviceName }) =>
    apmServices.includes(serviceName)
  );

  const allMetrics = [...apmServiceMetrics, ...matchedHealthStatuses];

  return joinByKey(allMetrics, 'serviceName');
}
