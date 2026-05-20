import type { AgentName } from '../../../typings/es_schemas/ui/fields/agent';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
export type LookupServicesResponse = Array<{
    serviceName: string;
    environments: string[];
    agentName: AgentName;
}>;
export declare function lookupServices({ apmEventClient, kuery, start, end, maxNumberOfServices, }: {
    apmEventClient: APMEventClient;
    kuery: string;
    start: number;
    end: number;
    maxNumberOfServices: number;
}): Promise<LookupServicesResponse>;
