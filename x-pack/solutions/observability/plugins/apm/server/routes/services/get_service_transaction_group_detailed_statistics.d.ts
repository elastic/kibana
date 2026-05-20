import type { ApmTransactionDocumentType } from '../../../common/document_type';
import type { LatencyAggregationType } from '../../../common/latency_aggregation_types';
import type { Coordinate } from '../../../typings/timeseries';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import type { RollupInterval } from '../../../common/rollup';
interface ServiceTransactionGroupDetailedStat {
    transactionName: string;
    latency: Coordinate[];
    throughput: Coordinate[];
    errorRate: Coordinate[];
    impact: number;
}
export interface ServiceTransactionGroupDetailedStatisticsResponse {
    currentPeriod: Record<string, ServiceTransactionGroupDetailedStat>;
    previousPeriod: Record<string, ServiceTransactionGroupDetailedStat>;
}
export declare function getServiceTransactionGroupDetailedStatisticsPeriods({ serviceName, transactionNames, apmEventClient, transactionType, documentType, rollupInterval, bucketSizeInSeconds, useDurationSummary, latencyAggregationType, environment, kuery, start, end, offset, }: {
    serviceName: string;
    transactionNames: string[];
    apmEventClient: APMEventClient;
    transactionType: string;
    documentType: ApmTransactionDocumentType;
    rollupInterval: RollupInterval;
    bucketSizeInSeconds: number;
    useDurationSummary: boolean;
    latencyAggregationType: LatencyAggregationType;
    environment: string;
    kuery: string;
    start: number;
    end: number;
    offset?: string;
}): Promise<ServiceTransactionGroupDetailedStatisticsResponse>;
export {};
