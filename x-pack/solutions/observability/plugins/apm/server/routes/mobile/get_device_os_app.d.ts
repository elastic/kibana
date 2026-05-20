import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
export declare function getDeviceOSApp({ kuery, apmEventClient, serviceName, transactionType, environment, start, end, size, }: {
    kuery: string;
    apmEventClient: APMEventClient;
    serviceName: string;
    transactionType?: string;
    environment: string;
    start: number;
    end: number;
    size: number;
}): Promise<Omit<import("@elastic/elasticsearch/lib/api/types").SearchResponse<import("@kbn/apm-types").Transaction, Record<string, import("@elastic/elasticsearch/lib/api/types").AggregationsAggregate>>, "hits" | "aggregations"> & {
    aggregations?: import("@kbn/es-types").AggregationResultOfMap<{
        devices: {
            terms: {
                field: string;
                size: number;
            };
        };
        osVersions: {
            terms: {
                field: string;
                size: number;
            };
        };
        appVersions: {
            terms: {
                field: string;
                size: number;
            };
        };
    }, import("@kbn/apm-types").Transaction> | undefined;
} & {
    hits: Omit<import("@elastic/elasticsearch/lib/api/types").SearchHitsMetadata<import("@kbn/apm-types").Transaction>, "total" | "hits"> & {
        total: {
            value: number;
            relation: "eq" | "gte";
        };
    } & {
        hits: import("@kbn/es-types").SearchHit<import("@kbn/apm-types").Transaction, undefined, undefined>[];
    };
}>;
