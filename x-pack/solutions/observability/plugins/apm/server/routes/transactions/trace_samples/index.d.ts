import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
export interface TransactionTraceSamplesResponse {
    traceSamples: Array<{
        score: number | null | undefined;
        timestamp: string;
        transactionId: string;
        traceId: string;
    }>;
}
export declare function getTraceSamples({ environment, kuery, serviceName, transactionName, transactionType, transactionId, traceId, sampleRangeFrom, sampleRangeTo, apmEventClient, start, end, }: {
    environment: string;
    kuery: string;
    serviceName: string;
    transactionName: string;
    transactionType: string;
    transactionId: string;
    traceId: string;
    sampleRangeFrom?: number;
    sampleRangeTo?: number;
    apmEventClient: APMEventClient;
    start: number;
    end: number;
}): Promise<TransactionTraceSamplesResponse>;
