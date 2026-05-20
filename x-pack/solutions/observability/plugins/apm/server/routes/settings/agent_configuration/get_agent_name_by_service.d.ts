import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
export declare function getAgentNameByService({ serviceName, apmEventClient, }: {
    serviceName: string;
    apmEventClient: APMEventClient;
}): Promise<string | undefined>;
