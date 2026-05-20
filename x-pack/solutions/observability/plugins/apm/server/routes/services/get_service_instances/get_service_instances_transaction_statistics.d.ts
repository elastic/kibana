import type { LatencyAggregationType } from '../../../../common/latency_aggregation_types';
import type { Coordinate } from '../../../../typings/timeseries';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
interface ServiceInstanceTransactionPrimaryStatistics {
    serviceNodeName: string;
    errorRate: number;
    latency: number;
    throughput: number;
}
interface ServiceInstanceTransactionComparisonStatistics {
    serviceNodeName: string;
    errorRate: Coordinate[];
    latency: Coordinate[];
    throughput: Coordinate[];
}
type ServiceInstanceTransactionStatistics<T> = T extends true ? ServiceInstanceTransactionComparisonStatistics : ServiceInstanceTransactionPrimaryStatistics;
export declare function getServiceInstancesTransactionStatistics<T extends true | false>({ environment, kuery, latencyAggregationType, apmEventClient, transactionType, serviceName, size, searchAggregatedTransactions, start, end, serviceNodeIds, numBuckets, includeTimeseries, offset, }: {
    latencyAggregationType: LatencyAggregationType;
    apmEventClient: APMEventClient;
    serviceName: string;
    transactionType: string;
    searchAggregatedTransactions: boolean;
    start: number;
    end: number;
    includeTimeseries: T;
    serviceNodeIds?: string[];
    environment: string;
    kuery: string;
    size?: number;
    numBuckets?: number;
    offset?: string;
}): Promise<Array<ServiceInstanceTransactionStatistics<T>>>;
export {};
