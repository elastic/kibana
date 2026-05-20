import * as t from 'io-ts';
import type { RandomSampler } from '../../../lib/helpers/get_random_sampler';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
export declare const downstreamDependenciesRouteRt: t.IntersectionC<[t.TypeC<{
    serviceName: t.StringC;
    start: t.StringC;
    end: t.StringC;
}>, t.PartialC<{
    serviceEnvironment: t.StringC;
}>]>;
export interface APMDownstreamDependency {
    'service.name'?: string;
    'span.destination.service.resource': string;
    'span.type'?: string;
    'span.subtype'?: string;
    errorRate?: number;
    latencyMs?: number;
    throughputPerMin?: number;
}
export declare function getApmDownstreamDependencies({ arguments: args, apmEventClient, randomSampler, }: {
    arguments: t.TypeOf<typeof downstreamDependenciesRouteRt>;
    apmEventClient: APMEventClient;
    randomSampler: RandomSampler;
}): Promise<APMDownstreamDependency[]>;
