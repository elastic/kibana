/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { uniq } from 'lodash';
import { arrayUnionToCallable } from '../../../../common/utils/array_union_to_callable';
import { PromiseReturnType } from '../../../../typings/common';
import {
  Setup,
  SetupTimeRange,
  SetupUIFilters,
} from '../../helpers/setup_request';
import { getServicesProjection } from '../../../../common/projections/services';
import {
  getTransactionDurationAvg,
  getAgentName,
  getTransactionRate,
  getErrorRate,
  getEnvironments,
} from './get_metrics';

export type ServiceListAPIResponse = PromiseReturnType<typeof getServicesItems>;
export type ServicesItemsSetup = Setup & SetupTimeRange & SetupUIFilters;
export type ServicesItemsProjection = ReturnType<typeof getServicesProjection>;

export async function getServicesItems(setup: ServicesItemsSetup) {
  const projection = getServicesProjection({ setup });

  const params = {
    setup,
    projection,
  };

  const [
    transactionDurationAvg,
    agentName,
    transactionRate,
    errorRate,
    environments,
  ] = await Promise.all([
    getTransactionDurationAvg(params),
    getAgentName(params),
    getTransactionRate(params),
    getErrorRate(params),
    getEnvironments(params),
  ]);

  const allMetrics = [
    transactionDurationAvg,
    agentName,
    transactionRate,
    errorRate,
    environments,
  ];

  const serviceNames = uniq(
    arrayUnionToCallable(
      allMetrics.flatMap((metric) =>
        arrayUnionToCallable(metric).map((service) => service.name)
      )
    )
  );

  const items = serviceNames.map((serviceName) => {
    return {
      serviceName,
      agentName:
        agentName.find((service) => service.name === serviceName)?.value ??
        null,
      transactionsPerMinute:
        transactionRate.find((service) => service.name === serviceName)
          ?.value ?? 0,
      errorsPerMinute:
        errorRate.find((service) => service.name === serviceName)?.value ?? 0,
      avgResponseTime:
        transactionDurationAvg.find((service) => service.name === serviceName)
          ?.value ?? null,
      environments:
        environments.find((service) => service.name === serviceName)?.value ??
        [],
    };
  });

  return items;
}
