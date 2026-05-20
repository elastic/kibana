import type { APMEventClient } from '@kbn/apm-data-access-plugin/server';
export declare function getTraceCorrelation({ apmEventClient, start, end, traceId, sourceNode, destinationNode, }: {
    apmEventClient: APMEventClient;
    start: number;
    end: number;
    traceId?: string;
    sourceNode: string;
    destinationNode: string;
}): Promise<{
    foundInSourceNode: boolean;
    foundInDestinationNode: boolean;
    foundInBothNodes: boolean;
    sourceNodeDocumentCount: number;
    destinationNodeDocumentCount: number;
    rawResponse: Omit<import("@elastic/elasticsearch/lib/api/types").SearchResponse<import("@kbn/apm-types").Span | import("@kbn/apm-types").Transaction, Record<string, import("@elastic/elasticsearch/lib/api/types").AggregationsAggregate>>, "hits" | "aggregations"> & {
        aggregations?: import("@kbn/es-types").AggregationResultOfMap<{
            source_node_traces: {
                filter: {
                    term: {
                        "service.name": string;
                    };
                };
                aggs: {
                    sample_docs: {
                        top_hits: {
                            size: number;
                        };
                    };
                };
            };
            destination_node_traces: {
                filter: {
                    term: {
                        "service.name": string;
                    };
                };
                aggs: {
                    sample_docs: {
                        top_hits: {
                            size: number;
                        };
                    };
                };
            };
        }, import("@kbn/apm-types").Span | import("@kbn/apm-types").Transaction> | undefined;
    } & {
        hits: Omit<import("@elastic/elasticsearch/lib/api/types").SearchHitsMetadata<import("@kbn/apm-types").Span | import("@kbn/apm-types").Transaction>, "total" | "hits"> & {
            total: {
                value: number;
                relation: "eq" | "gte";
            };
        } & {
            hits: import("@kbn/es-types").SearchHit<import("@kbn/apm-types").Span | import("@kbn/apm-types").Transaction, undefined, undefined>[];
        };
    };
}>;
