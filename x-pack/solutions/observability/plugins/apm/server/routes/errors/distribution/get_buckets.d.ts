import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
export declare function getBuckets({ environment, kuery, serviceName, groupId, transactionName, bucketSize, apmEventClient, start, end, }: {
    environment: string;
    kuery: string;
    serviceName: string;
    groupId?: string;
    transactionName?: string;
    bucketSize: number;
    apmEventClient: APMEventClient;
    start: number;
    end: number;
}): Promise<{
    buckets: {
        x: number;
        y: number;
    }[];
}>;
