import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
export declare function getTransactionsPerMinute({ apmEventClient, bucketSize, searchAggregatedTransactions, start, end, intervalString, }: {
    apmEventClient: APMEventClient;
    bucketSize: number;
    intervalString: string;
    searchAggregatedTransactions: boolean;
    start: number;
    end: number;
}): Promise<{
    value: undefined;
    timeseries: never[];
} | {
    value: number;
    timeseries: {
        x: number;
        y: number | null;
    }[];
}>;
