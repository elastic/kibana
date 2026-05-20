import type { ApmDocumentType } from '../../../../common/document_type';
import type { RollupInterval } from '../../../../common/rollup';
import type { ServiceGroup } from '../../../../common/service_groups';
import type { AgentName } from '../../../../typings/es_schemas/ui/fields/agent';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import type { RandomSampler } from '../../../lib/helpers/get_random_sampler';
interface AggregationParams {
    environment: string;
    kuery: string;
    apmEventClient: APMEventClient;
    maxNumServices: number;
    start: number;
    end: number;
    serviceGroup: ServiceGroup | null;
    randomSampler: RandomSampler;
    documentType: ApmDocumentType.ServiceTransactionMetric | ApmDocumentType.TransactionMetric | ApmDocumentType.TransactionEvent;
    rollupInterval: RollupInterval;
    useDurationSummary: boolean;
    searchQuery: string | undefined;
}
export interface ServiceTransactionStatsResponse {
    serviceStats: Array<{
        serviceName: string;
        transactionType?: string;
        environments: string[];
        agentName?: AgentName;
        latency?: number | null;
        transactionErrorRate?: number;
        throughput?: number;
    }>;
    maxCountExceeded: boolean;
    serviceOverflowCount: number;
}
export declare function getServiceTransactionStats({ environment, kuery, apmEventClient, maxNumServices, start, end, serviceGroup, randomSampler, documentType, rollupInterval, useDurationSummary, searchQuery, }: AggregationParams): Promise<ServiceTransactionStatsResponse>;
export {};
