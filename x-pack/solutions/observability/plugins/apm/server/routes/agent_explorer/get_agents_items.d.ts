import type { AgentName } from '../../../typings/es_schemas/ui/fields/agent';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import type { RandomSampler } from '../../lib/helpers/get_random_sampler';
interface AggregationParams {
    environment: string;
    serviceName?: string;
    agentLanguage?: string;
    kuery: string;
    apmEventClient: APMEventClient;
    start: number;
    end: number;
    randomSampler: RandomSampler;
}
export declare function getAgentsItems({ environment, agentLanguage, serviceName, kuery, apmEventClient, start, end, randomSampler, }: AggregationParams): Promise<{
    serviceName: string;
    environments: string[];
    agentName: AgentName;
    agentVersion: string[];
    agentTelemetryAutoVersion: string[];
    instances: number;
}[]>;
export {};
