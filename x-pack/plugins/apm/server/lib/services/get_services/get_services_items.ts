/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { joinByKey } from '../../../../common/utils/join_by_key';
import { PromiseReturnType } from '../../../../typings/common';
import { Setup, SetupTimeRange } from '../../helpers/setup_request';
import { getServicesProjection } from '../../../projections/services';
import {
  getTransactionDurationAverages,
  getAgentNames,
  getTransactionRates,
  getTransactionErrorRates,
  getEnvironments,
  getHealthStatuses,
} from './get_services_items_stats';

export type ServiceListAPIResponse = PromiseReturnType<typeof getServicesItems>;
export type ServicesItemsSetup = Setup & SetupTimeRange;
export type ServicesItemsProjection = ReturnType<typeof getServicesProjection>;

export async function getServicesItems({
  setup,
  searchAggregatedTransactions,
}: {
  setup: ServicesItemsSetup;
  searchAggregatedTransactions: boolean;
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
    getHealthStatuses(params, setup.uiFilters.environment),
  ]);

  const allMetrics = [
    ...transactionDurationAverages,
    ...agentNames,
    ...transactionRates,
    ...transactionErrorRates,
    ...environments,
    ...healthStatuses,
  ];

  return joinByKey(allMetrics, 'serviceName');
}
