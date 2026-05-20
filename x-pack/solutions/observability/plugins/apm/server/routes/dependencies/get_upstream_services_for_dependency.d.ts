import type { ConnectionStats, Node } from '../../../common/connections';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import type { RandomSampler } from '../../lib/helpers/get_random_sampler';
interface Options {
    apmEventClient: APMEventClient;
    start: number;
    end: number;
    dependencyName: string;
    numBuckets: number;
    kuery: string;
    environment: string;
    offset?: string;
    randomSampler: RandomSampler;
}
export interface UpstreamServicesForDependencyResponse {
    services: Array<{
        location: Node;
        currentStats: ConnectionStats & {
            impact: number;
        };
        previousStats: (ConnectionStats & {
            impact: number;
        }) | null;
    }>;
}
export declare function getUpstreamServicesForDependency(options: Options): Promise<UpstreamServicesForDependencyResponse>;
export {};
