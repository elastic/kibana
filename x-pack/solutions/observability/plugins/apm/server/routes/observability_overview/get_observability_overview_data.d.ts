import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
export interface ObservabilityOverviewResponse {
    serviceCount: number;
    transactionPerMinute: {
        value: number | undefined;
        timeseries: Array<{
            x: number;
            y: number | null;
        }>;
    };
}
export declare function getObservabilityOverviewData({ apmEventClient, start, end, searchAggregatedTransactions, bucketSize, intervalString, }: {
    apmEventClient: APMEventClient;
    start: number;
    end: number;
    searchAggregatedTransactions: boolean;
    bucketSize: number;
    intervalString: string;
}): Promise<ObservabilityOverviewResponse>;
