import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
export declare const getInfrastructureData: ({ kuery, serviceName, agentName, environment, apmEventClient, start, end, }: {
    kuery: string;
    agentName: string | undefined;
    serviceName: string;
    environment: string;
    apmEventClient: APMEventClient;
    start: number;
    end: number;
}) => Promise<{
    containerIds: string[];
    hostNames: string[];
    podNames: string[];
}>;
