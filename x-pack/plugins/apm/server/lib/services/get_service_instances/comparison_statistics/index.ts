/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Coordinate } from '../../../../../typings/timeseries';
import { LatencyAggregationType } from '../../../../../common/latency_aggregation_types';
import { joinByKey } from '../../../../../common/utils/join_by_key';
import { withApmSpan } from '../../../../utils/with_apm_span';
import { Setup } from '../../../helpers/setup_request';
import { getServiceInstanceSystemMetricStats } from './get_service_instance_system_metric_stats';
import { getServiceInstanceTransactionStats } from './get_service_instance_transaction_stats';

export interface ServiceInstanceComparisonStatisticsParams {
  environment?: string;
  kuery?: string;
  latencyAggregationType: LatencyAggregationType;
  setup: Setup;
  serviceName: string;
  transactionType: string;
  searchAggregatedTransactions: boolean;
  numBuckets: number;
  start: number;
  end: number;
  serviceNodeIds: string[];
}

interface ServiceInstancesComparisonStatistics {
  serviceNodeName: string;
  errorRate?: Coordinate[];
  throughput?: Coordinate[];
  latency?: Coordinate[];
  cpuUsage?: Coordinate[];
  memoryUsage?: Coordinate[];
}

export async function getServiceInstancesComparisonStatistics(
  params: ServiceInstanceComparisonStatisticsParams
): Promise<ServiceInstancesComparisonStatistics[]> {
  return withApmSpan('get_service_instances', async () => {
    const [transactionStats, systemMetricStats = []] = await Promise.all([
      getServiceInstanceTransactionStats(params),
      getServiceInstanceSystemMetricStats(params),
    ]);

    const stats = joinByKey(
      [...transactionStats, ...systemMetricStats],
      'serviceNodeName'
    );

    return stats;
  });
}
