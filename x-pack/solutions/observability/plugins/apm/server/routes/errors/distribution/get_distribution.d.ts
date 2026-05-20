import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import type { Maybe } from '../../../../typings/common';
export interface ErrorDistributionResponse {
    currentPeriod: Array<{
        x: number;
        y: number;
    }>;
    previousPeriod: Array<{
        x: number;
        y: Maybe<number>;
    }>;
    bucketSize: number;
}
export declare function getErrorDistribution({ environment, kuery, serviceName, groupId, transactionName, apmEventClient, start, end, offset, bucketSizeInSeconds, }: {
    environment: string;
    kuery: string;
    serviceName: string;
    groupId?: string;
    transactionName?: string;
    apmEventClient: APMEventClient;
    start: number;
    end: number;
    offset?: string;
    bucketSizeInSeconds?: number;
}): Promise<ErrorDistributionResponse>;
