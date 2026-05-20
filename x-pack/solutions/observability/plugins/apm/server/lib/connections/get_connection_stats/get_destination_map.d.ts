import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { Node } from '../../../../common/connections';
import type { APMEventClient } from '../../helpers/create_es_client/create_apm_event_client';
import type { RandomSampler } from '../../helpers/get_random_sampler';
export declare const getDestinationMap: ({ apmEventClient, start, end, filter, offset, randomSampler, }: {
    apmEventClient: APMEventClient;
    start: number;
    end: number;
    filter: QueryDslQueryContainer[];
    offset?: string;
    randomSampler: RandomSampler;
}) => Promise<{
    nodesBydependencyName: Map<string, Node>;
    sampled: boolean;
}>;
