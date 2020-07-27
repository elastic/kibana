/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { joinByKey } from '../../../../common/utils/join_by_key';
import { PromiseReturnType } from '../../../../typings/common';
import {
  Setup,
  SetupTimeRange,
  SetupUIFilters,
} from '../../helpers/setup_request';
import { getServicesProjection } from '../../../../common/projections/services';
import {
  getTransactionDurationAverages,
  getAgentNames,
  getTransactionRates,
  getErrorRates,
  getEnvironments,
} from './get_services_items_stats';

export type ServiceListAPIResponse = PromiseReturnType<typeof getServicesItems>;
export type ServicesItemsSetup = Setup & SetupTimeRange & SetupUIFilters;
export type ServicesItemsProjection = ReturnType<typeof getServicesProjection>;

export async function getServicesItems(setup: ServicesItemsSetup) {
  const params = {
    projection: getServicesProjection({ setup, noEvents: true }),
    setup,
  };

  const [
    transactionDurationAverages,
    agentNames,
    transactionRates,
    errorRates,
    environments,
  ] = await Promise.all([
    getTransactionDurationAverages(params),
    getAgentNames(params),
    getTransactionRates(params),
    getErrorRates(params),
    getEnvironments(params),
  ]);

  const allMetrics = [
    ...transactionDurationAverages,
    ...agentNames,
    ...transactionRates,
    ...errorRates,
    ...environments,
  ];

  return joinByKey(allMetrics, 'serviceName');
}
