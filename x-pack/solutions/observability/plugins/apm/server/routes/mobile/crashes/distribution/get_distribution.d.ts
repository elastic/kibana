import type { APMEventClient } from '../../../../lib/helpers/create_es_client/create_apm_event_client';
import type { Maybe } from '../../../../../typings/common';
export interface CrashDistributionResponse {
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
export declare function getCrashDistribution({ environment, kuery, serviceName, groupId, apmEventClient, start, end, offset, }: {
    environment: string;
    kuery: string;
    serviceName: string;
    groupId?: string;
    apmEventClient: APMEventClient;
    start: number;
    end: number;
    offset?: string;
}): Promise<CrashDistributionResponse>;
