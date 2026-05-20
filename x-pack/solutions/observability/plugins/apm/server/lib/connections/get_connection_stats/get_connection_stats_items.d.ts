import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { AgentName } from '../../../../typings/es_schemas/ui/fields/agent';
import { NodeType } from '../../../../common/connections';
import type { APMEventClient } from '../../helpers/create_es_client/create_apm_event_client';
export declare const getConnectionStatsItems: ({ apmEventClient, start, end, filter, numBuckets, offset, withTimeseries, }: {
    apmEventClient: APMEventClient;
    start: number;
    end: number;
    filter: QueryDslQueryContainer[];
    numBuckets: number;
    offset?: string;
    withTimeseries: boolean;
}) => Promise<{
    from: {
        id: string;
        serviceName: string;
        environment: string;
        agentName: AgentName;
        type: NodeType.service;
    };
    to: {
        id: string;
        dependencyName: string;
        spanType: string;
        spanSubtype: string;
        type: NodeType.dependency;
    };
    value: {
        latency_count: number;
        latency_sum: number;
        error_count: number;
        success_count: number;
    };
    timeseries: {
        x: number;
        latency_count: number;
        latency_sum: number;
        error_count: number;
        success_count: number;
    }[] | undefined;
}[]>;
