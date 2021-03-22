/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LatencyAggregationType } from '../../../../common/latency_aggregation_types';
import { joinByKey } from '../../../../common/utils/join_by_key';
import { withApmSpan } from '../../../utils/with_apm_span';
import { Setup } from '../../helpers/setup_request';
import { getServiceInstanceSystemMetricComparisonStatistics } from './get_service_instance_system_metric_statistics';
import { getServiceInstanceTransactionComparisonStatistics } from './get_service_instance_transaction_statistics';

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

// interface ServiceInstancesComparisonStatistics {
//   serviceNodeName: string;
//   errorRate?: Coordinate[];
//   throughput?: Coordinate[];
//   latency?: Coordinate[];
//   cpuUsage?: Coordinate[];
//   memoryUsage?: Coordinate[];
// }

export async function getServiceInstancesComparisonStatistics(
  params: ServiceInstanceComparisonStatisticsParams
) {
  return withApmSpan(
    'get_service_instances_comparison_statistics',
    async () => {
      const [transactionStats, systemMetricStats = []] = await Promise.all([
        getServiceInstanceTransactionComparisonStatistics(params),
        getServiceInstanceSystemMetricComparisonStatistics(params),
      ]);

      const stats = joinByKey(
        [...transactionStats, ...systemMetricStats],
        'serviceNodeName'
      );

      return stats;
    }
  );
}
