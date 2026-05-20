import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import type { RandomSampler } from '../../lib/helpers/get_random_sampler';
export type ServiceDependenciesBreakdownResponse = Array<{
    title: string;
    data: Array<{
        x: number;
        y: number;
    }>;
}>;
export declare function getServiceDependenciesBreakdown({ apmEventClient, start, end, serviceName, environment, kuery, randomSampler, }: {
    apmEventClient: APMEventClient;
    start: number;
    end: number;
    serviceName: string;
    environment: string;
    kuery: string;
    randomSampler: RandomSampler;
}): Promise<ServiceDependenciesBreakdownResponse>;
