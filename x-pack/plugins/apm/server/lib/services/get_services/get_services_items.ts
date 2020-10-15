/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Logger } from '@kbn/logging';
import { DateBucketUnit } from '../../../../common/utils/get_date_bucket_options';
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
  logger,
  intervalString,
  unit,
}: {
  setup: ServicesItemsSetup;
  searchAggregatedTransactions: boolean;
  logger: Logger;
  intervalString: string;
  unit: DateBucketUnit;
}) {
  const params = {
    projection: getServicesProjection({
      setup,
      searchAggregatedTransactions,
    }),
    setup,
    searchAggregatedTransactions,
    intervalString,
    unit,
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
