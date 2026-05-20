import type { InstancesSortField } from '../../../../common/instances';
import type { LatencyAggregationType } from '../../../../common/latency_aggregation_types';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
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
export declare function getServiceInstancesMainStatistics({ sortDirection, sortField, ...params }: Omit<ServiceInstanceMainStatisticsParams, 'size'>): Promise<ServiceInstanceMainStatisticsResponse>;
export {};
