import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
export declare function getDownstreamServiceResource({ traceId, start, end, apmEventClient, }: {
    traceId: string;
    start: number;
    end: number;
    apmEventClient: APMEventClient;
}): Promise<string | undefined>;
