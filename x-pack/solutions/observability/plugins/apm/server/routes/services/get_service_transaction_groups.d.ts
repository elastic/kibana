import type { ApmTransactionDocumentType } from '../../../common/document_type';
import type { LatencyAggregationType } from '../../../common/latency_aggregation_types';
import type { RollupInterval } from '../../../common/rollup';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
export declare const MAX_NUMBER_OF_TX_GROUPS = 1000;
export interface TransactionGroups {
    alertsCount: number;
    name: string;
    transactionType: string;
    latency: number | null;
    throughput: number;
    errorRate: number;
    impact: number;
}
export interface ServiceTransactionGroupsResponse {
    transactionGroups: TransactionGroups[];
    maxCountExceeded: boolean;
    transactionOverflowCount: number;
    hasActiveAlerts: boolean;
}
export declare function getServiceTransactionGroups({ environment, kuery, serviceName, apmEventClient, transactionType, latencyAggregationType, start, end, documentType, rollupInterval, useDurationSummary, searchQuery, }: {
    environment: string;
    kuery: string;
    serviceName: string;
    apmEventClient: APMEventClient;
    transactionType: string;
    latencyAggregationType: LatencyAggregationType;
    start: number;
    end: number;
    documentType: ApmTransactionDocumentType;
    rollupInterval: RollupInterval;
    useDurationSummary: boolean;
    searchQuery?: string;
}): Promise<ServiceTransactionGroupsResponse>;
