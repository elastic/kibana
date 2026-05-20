import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
/**
 * This is used for getting *all* environments, and does not filter by range.
 * It's used in places where we get the list of all possible environments.
 */
export declare function getAllEnvironments({ includeMissing, searchAggregatedTransactions, serviceName, apmEventClient, size, }: {
    includeMissing?: boolean;
    searchAggregatedTransactions: boolean;
    serviceName?: string;
    apmEventClient: APMEventClient;
    size: number;
}): Promise<string[]>;
