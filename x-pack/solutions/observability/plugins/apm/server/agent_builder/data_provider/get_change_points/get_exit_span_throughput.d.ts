import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
export declare function getExitSpanThroughput({ apmEventClient, start, end, intervalString, bucketSize, filter, spanDestinationServiceResource, }: {
    apmEventClient: APMEventClient;
    start: number;
    end: number;
    intervalString: string;
    bucketSize: number;
    filter: QueryDslQueryContainer[];
    spanDestinationServiceResource?: string;
}): Promise<{
    value: number | null;
    data: {
        x: number;
        y: number;
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
    unit: string;
}[]>;
