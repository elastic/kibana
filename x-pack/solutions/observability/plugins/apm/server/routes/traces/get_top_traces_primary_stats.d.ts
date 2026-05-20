import type { AgentName } from '../../../typings/es_schemas/ui/fields/agent';
import type { SERVICE_NAME, TRANSACTION_NAME } from '../../../common/es_fields/apm';
import type { RandomSampler } from '../../lib/helpers/get_random_sampler';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
export type BucketKey = Record<typeof TRANSACTION_NAME | typeof SERVICE_NAME, string>;
interface TopTracesParams {
    environment: string;
    kuery: string;
    transactionName?: string;
    searchAggregatedTransactions: boolean;
    start: number;
    end: number;
    apmEventClient: APMEventClient;
    randomSampler: RandomSampler;
}
export interface TopTracesPrimaryStatsResponse {
    items: Array<{
        key: BucketKey;
        serviceName: string;
        transactionName: string;
        averageResponseTime: number | null;
        transactionsPerMinute: number;
        transactionType: string;
        impact: number;
        agentName: AgentName;
    }>;
}
export declare function getTopTracesPrimaryStats({ environment, kuery, transactionName, searchAggregatedTransactions, start, end, apmEventClient, randomSampler, }: TopTracesParams): Promise<TopTracesPrimaryStatsResponse>;
export {};
