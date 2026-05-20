import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
export declare function getServiceCount({ apmEventClient, searchAggregatedTransactions, start, end, }: {
    apmEventClient: APMEventClient;
    searchAggregatedTransactions: boolean;
    start: number;
    end: number;
}): Promise<number>;
