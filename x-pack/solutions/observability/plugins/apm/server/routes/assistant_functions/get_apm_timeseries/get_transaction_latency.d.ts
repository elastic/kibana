import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { LatencyAggregationType } from '../../../../common/latency_aggregation_types';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
export declare function getTransactionLatency({ apmEventClient, start, end, intervalString, filter, transactionType, transactionName, latencyAggregationType, }: {
    apmEventClient: APMEventClient;
    start: number;
    end: number;
    intervalString: string;
    bucketSize: number;
    filter: QueryDslQueryContainer[];
    transactionType?: string;
    transactionName?: string;
    latencyAggregationType: LatencyAggregationType;
}): Promise<{
    data: {
        x: number;
        y: number | null;
    }[];
    groupBy: string;
    change_point: {
        bucket?: {
            key: string;
        };
        type: Record<import("@kbn/es-types/src").ChangePointType, {
            change_point?: number;
            r_value?: number;
            trend?: string;
            p_value?: number;
        }>;
    };
    value: number | null;
    unit: string;
}[]>;
