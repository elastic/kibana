import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
/**
 * This is used for getting the list of environments for the environment selector,
 * filtered by range.
 */
export declare function hasUnsetValueForField({ searchAggregatedTransactions, apmEventClient, serviceName, fieldName, start, end, }: {
    apmEventClient: APMEventClient;
    searchAggregatedTransactions: boolean;
    serviceName: string | undefined;
    fieldName: string;
    start: number;
    end: number;
}): Promise<boolean>;
