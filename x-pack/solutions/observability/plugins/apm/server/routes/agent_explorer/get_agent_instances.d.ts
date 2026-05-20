import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
export type AgentExplorerAgentInstancesResponse = Array<{
    serviceNode: string;
    environments: string[];
    agentVersion: string;
    lastReport: string;
}>;
export declare function getAgentInstances({ environment, serviceName, kuery, apmEventClient, start, end, }: {
    environment: string;
    serviceName?: string;
    kuery: string;
    apmEventClient: APMEventClient;
    start: number;
    end: number;
}): Promise<AgentExplorerAgentInstancesResponse>;
