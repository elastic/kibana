/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { joinByKey } from '../../../../common/utils/join_by_key';
import { Setup, SetupTimeRange } from '../../helpers/setup_request';
import { getServiceInstanceErrorStats } from './get_service_instance_error_stats';
import { getServiceInstanceSystemMetricStats } from './get_service_instance_system_metric_stats';
import { getServiceInstanceTransactionStats } from './get_service_instance_transaction_stats';

export interface ServiceInstanceParams {
  setup: Setup & SetupTimeRange;
  serviceName: string;
  transactionType: string;
  searchAggregatedTransactions: boolean;
  size: number;
}

export async function getServiceInstances(
  params: Omit<ServiceInstanceParams, 'size'>
) {
  const paramsForSubQueries = {
    ...params,
    size: 50,
  };

  const [errorStats, transactionStats, systemMetricStats] = await Promise.all([
    getServiceInstanceErrorStats(paramsForSubQueries),
    getServiceInstanceTransactionStats(paramsForSubQueries),
    getServiceInstanceSystemMetricStats(paramsForSubQueries),
  ]);

  const stats = joinByKey(
    [...errorStats, ...transactionStats, ...systemMetricStats],
    'serviceNodeName'
  );

  return stats;
}
