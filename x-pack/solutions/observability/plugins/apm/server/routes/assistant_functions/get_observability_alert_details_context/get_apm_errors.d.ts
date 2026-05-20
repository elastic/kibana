import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
export declare function getApmErrors(params: {
    apmEventClient: APMEventClient;
    start: string;
    end: string;
    serviceName: string;
    serviceEnvironment?: string;
}): Promise<{
    downstreamServiceResource: string | undefined;
    groupId: string;
    name: string;
    lastSeen: number;
    occurrences: number;
    culprit: string | undefined;
    handled: boolean | undefined;
    type: string | undefined;
    traceId: string | undefined;
}[]>;
