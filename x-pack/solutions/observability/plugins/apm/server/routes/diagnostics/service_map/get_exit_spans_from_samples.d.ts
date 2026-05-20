import type { ESSearchResponse, ESSearchRequest } from '@kbn/es-types';
import type { APMEventClient } from '@kbn/apm-data-access-plugin/server';
type DestinationsBySpanId = Map<string, string | undefined>;
export declare function getExitSpans({ apmEventClient, start, end, destinationNode, parentSpans, }: {
    apmEventClient: APMEventClient;
    start: number;
    end: number;
    sourceNode: string;
    destinationNode: string;
    parentSpans: DestinationsBySpanId;
}): Promise<{
    apmExitSpans: {
        destinationService: string;
        spanId: string;
        transactionId: string;
        serviceNodeName: string;
        traceId: string;
        agentName: string;
    }[];
    totalConnections: number;
    rawResponse: Omit<import("@elastic/elasticsearch/lib/api/types").SearchResponse<import("@kbn/apm-types").Transaction, Record<string, import("@elastic/elasticsearch/lib/api/types").AggregationsAggregate>>, "hits" | "aggregations"> & {
        aggregations?: import("@kbn/es-types").AggregationResultOfMap<{
            matching_destination_resources: {
                filter: {
                    term: {
                        "service.name": string;
                    };
                };
                aggs: {
                    sample_docs: {
                        top_hits: {
                            size: number;
                            fields: ("agent.name" | "service.name" | "service.node.name" | "span.id" | "trace.id" | "transaction.id" | "parent.id" | "span.name")[];
                        };
                    };
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
    };
    hasMatchingDestinationResources: boolean;
}>;
export declare function getSourceSpanIds({ apmEventClient, start, end, sourceNode, traceIds, }: {
    apmEventClient: APMEventClient;
    start: number;
    end: number;
    sourceNode: string;
    traceIds: string[];
}): Promise<{
    destinationsBySpanId: DestinationsBySpanId;
    sourceSpanIdsRawResponse: ESSearchResponse<unknown, ESSearchRequest>;
}>;
export declare function getDestinationParentIds({ apmEventClient, start, end, parentSpans, destinationNode, }: {
    apmEventClient: APMEventClient;
    start: number;
    end: number;
    parentSpans: DestinationsBySpanId;
    destinationNode: string;
}): Promise<{
    rawResponse: Omit<import("@elastic/elasticsearch/lib/api/types").SearchResponse<import("@kbn/apm-types").Transaction, Record<string, import("@elastic/elasticsearch/lib/api/types").AggregationsAggregate>>, "hits" | "aggregations"> & {
        aggregations?: import("@kbn/es-types").AggregationResultOfMap<{
            sample_docs: {
                top_hits: {
                    size: number;
                    fields: string[];
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
    };
    hasParent: boolean;
}>;
export {};
