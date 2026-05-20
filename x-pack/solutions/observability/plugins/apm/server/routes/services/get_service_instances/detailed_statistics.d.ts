import type { Coordinate } from '../../../../typings/timeseries';
import type { LatencyAggregationType } from '../../../../common/latency_aggregation_types';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
interface ServiceInstancesDetailedStat {
    serviceNodeName: string;
    errorRate?: Coordinate[];
    latency?: Coordinate[];
    throughput?: Coordinate[];
    cpuUsage?: Coordinate[];
    memoryUsage?: Coordinate[];
}
export interface ServiceInstancesDetailedStatisticsResponse {
    currentPeriod: Record<string, ServiceInstancesDetailedStat>;
    previousPeriod: Record<string, ServiceInstancesDetailedStat>;
}
export declare function getServiceInstancesDetailedStatisticsPeriods({ environment, kuery, latencyAggregationType, apmEventClient, serviceName, transactionType, searchAggregatedTransactions, numBuckets, serviceNodeIds, start, end, offset, }: {
    environment: string;
    kuery: string;
    latencyAggregationType: LatencyAggregationType;
    apmEventClient: APMEventClient;
    serviceName: string;
    transactionType: string;
    searchAggregatedTransactions: boolean;
    numBuckets: number;
    serviceNodeIds: string[];
    start: number;
    end: number;
    offset?: string;
}): Promise<ServiceInstancesDetailedStatisticsResponse>;
export {};
