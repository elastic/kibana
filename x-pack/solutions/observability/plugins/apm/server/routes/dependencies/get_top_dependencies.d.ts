import type { ConnectionStats, Node } from '../../../common/connections';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import type { RandomSampler } from '../../lib/helpers/get_random_sampler';
interface Options {
    apmEventClient: APMEventClient;
    start: number;
    end: number;
    numBuckets: number;
    environment: string;
    offset?: string;
    kuery: string;
    randomSampler: RandomSampler;
    withTimeseries: boolean;
}
export interface TopDependenciesResponse {
    dependencies: Array<{
        currentStats: ConnectionStats & {
            impact: number;
        };
        previousStats: (ConnectionStats & {
            impact: number;
        }) | null;
        location: Node;
    }>;
    sampled: boolean;
}
export declare function getTopDependencies(options: Options): Promise<TopDependenciesResponse>;
export {};
