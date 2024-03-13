/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { keyBy, orderBy } from 'lodash';
import { InstancesSortField } from '../../../../common/instances';
import { LatencyAggregationType } from '../../../../common/latency_aggregation_types';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { withApmSpan } from '../../../utils/with_apm_span';
import { getServiceInstancesSystemMetricStatistics } from './get_service_instances_system_metric_statistics';
import { getServiceInstancesTransactionStatistics } from './get_service_instances_transaction_statistics';

interface ServiceInstanceMainStatisticsParams {
  environment: string;
  kuery: string;
  latencyAggregationType: LatencyAggregationType;
  apmEventClient: APMEventClient;
  serviceName: string;
  transactionType: string;
  searchAggregatedTransactions: boolean;
  size: number;
  start: number;
  end: number;
  offset?: string;
  sortField: InstancesSortField;
  sortDirection: 'asc' | 'desc';
}

export type ServiceInstanceMainStatisticsResponse = Array<{
  serviceNodeName: string;
  errorRate?: number;
  latency?: number;
  throughput?: number;
  cpuUsage?: number | null;
  memoryUsage?: number | null;
}>;

export async function getServiceInstancesMainStatistics({
  sortDirection,
  sortField,
  ...params
}: Omit<
  ServiceInstanceMainStatisticsParams,
  'size'
>): Promise<ServiceInstanceMainStatisticsResponse> {
  return withApmSpan('get_service_instances_main_statistics', async () => {
    const paramsForSubQueries = {
      ...params,
      size: 1000,
    };

    const transactionStats = await getServiceInstancesTransactionStatistics({
      ...paramsForSubQueries,
      includeTimeseries: false,
    });
    const serviceNodeIds = transactionStats.map((item) => item.serviceNodeName);
    const systemMetricStats = await getServiceInstancesSystemMetricStatistics({
      ...paramsForSubQueries,
      includeTimeseries: false,
      serviceNodeIds,
    });

    const systemMetricStatsMap = keyBy(systemMetricStats, 'serviceNodeName');
    const stats = transactionStats.length
      ? transactionStats.map((item) => ({
          ...item,
          ...(systemMetricStatsMap[item.serviceNodeName] || {}),
        }))
      : systemMetricStats;

    return orderBy(stats, sortField, sortDirection).slice(0, 100);
  });
}
