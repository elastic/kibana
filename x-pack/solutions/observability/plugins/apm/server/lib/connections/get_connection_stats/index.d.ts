import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { APMEventClient } from '../../helpers/create_es_client/create_apm_event_client';
import type { RandomSampler } from '../../helpers/get_random_sampler';
export declare function getConnectionStats({ apmEventClient, start, end, numBuckets, filter, collapseBy, offset, randomSampler, withTimeseries, }: {
    apmEventClient: APMEventClient;
    start: number;
    end: number;
    numBuckets: number;
    filter: QueryDslQueryContainer[];
    collapseBy: 'upstream' | 'downstream';
    offset?: string;
    randomSampler: RandomSampler;
    withTimeseries?: boolean;
}): Promise<{
    statsItems: {
        stats: {
            latency: {
                value: number | null;
                timeseries: {
                    x: number;
                    y: number | null;
                }[] | undefined;
            };
            totalTime: {
                value: number;
                timeseries: {
                    x: number;
                    y: number;
                }[] | undefined;
            };
            throughput: {
                value: number | null;
                timeseries: {
                    x: number;
                    y: number | null;
                }[] | undefined;
            };
            errorRate: {
                value: number | null;
                timeseries: {
                    x: number;
                    y: number | null;
                }[] | undefined;
            };
        };
        location: import("@kbn/apm-types").DependencyNode | {
            id: string;
            serviceName: string;
            environment: string;
            agentName: import("@kbn/elastic-agent-utils").AgentName;
            type: import("@kbn/apm-types").NodeType.service;
        };
        id: string;
    }[];
    sampled: boolean;
}>;
