import type { ConnectionStatsItemWithImpact } from '../../../common/connections';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import type { RandomSampler } from '../../lib/helpers/get_random_sampler';
interface Options {
    apmEventClient: APMEventClient;
    start: number;
    end: number;
    serviceName: string;
    numBuckets: number;
    environment: string;
    offset?: string;
    randomSampler: RandomSampler;
}
export type ServiceDependenciesResponse = Array<Omit<ConnectionStatsItemWithImpact, 'stats'> & {
    currentStats: ConnectionStatsItemWithImpact['stats'];
    previousStats: ConnectionStatsItemWithImpact['stats'] | null;
}>;
export declare function getServiceDependencies(opts: Options): Promise<ServiceDependenciesResponse>;
export {};
