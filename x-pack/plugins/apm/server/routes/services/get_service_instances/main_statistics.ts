/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LatencyAggregationType } from '../../../../common/latency_aggregation_types';
import { joinByKey } from '../../../../common/utils/join_by_key';
import { withApmSpan } from '../../../utils/with_apm_span';
import { Setup } from '../../../lib/helpers/setup_request';
import { getServiceInstancesSystemMetricStatistics } from './get_service_instances_system_metric_statistics';
import { getServiceInstancesTransactionStatistics } from './get_service_instances_transaction_statistics';

interface ServiceInstanceMainStatisticsParams {
  environment: string;
  kuery: string;
  latencyAggregationType: LatencyAggregationType;
  setup: Setup;
  serviceName: string;
  transactionType: string;
  searchAggregatedTransactions: boolean;
  size: number;
  start: number;
  end: number;
  offset?: string;
}

export async function getServiceInstancesMainStatistics(
  params: Omit<ServiceInstanceMainStatisticsParams, 'size'>
): Promise<
  Array<{
    serviceNodeName: string;
    errorRate?: number;
    latency?: number;
    throughput?: number;
    cpuUsage?: number | null;
    memoryUsage?: number | null;
  }>
> {
  return withApmSpan('get_service_instances_main_statistics', async () => {
    const paramsForSubQueries = {
      ...params,
      size: 50,
    };

    const [transactionStats, systemMetricStats] = await Promise.all([
      getServiceInstancesTransactionStatistics({
        ...paramsForSubQueries,
        isComparisonSearch: false,
      }),
      getServiceInstancesSystemMetricStatistics({
        ...paramsForSubQueries,
        isComparisonSearch: false,
      }),
    ]);

    const stats = joinByKey(
      [...transactionStats, ...systemMetricStats],
      'serviceNodeName'
    );

    return stats;
  });
}
