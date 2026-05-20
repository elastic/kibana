import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
export interface TopErroneousTransactionsResponse {
    topErroneousTransactions: Array<{
        transactionName: string;
        currentPeriodTimeseries: Array<{
            x: number;
            y: number;
        }>;
        previousPeriodTimeseries: Array<{
            x: number;
            y: number;
        }>;
        transactionType: string | undefined;
        occurrences: number;
    }>;
}
export declare function getTopErroneousTransactionsPeriods({ kuery, serviceName, apmEventClient, numBuckets, groupId, environment, start, end, offset, }: {
    kuery: string;
    serviceName: string;
    apmEventClient: APMEventClient;
    numBuckets: number;
    groupId: string;
    environment: string;
    start: number;
    end: number;
    offset?: string;
}): Promise<TopErroneousTransactionsResponse>;
