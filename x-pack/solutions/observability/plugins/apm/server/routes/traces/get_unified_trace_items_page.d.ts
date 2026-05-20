import type { SortResults } from '@elastic/elasticsearch/lib/api/types';
import type { APMEventClient } from '@kbn/apm-data-access-plugin/server';
export declare const fields: ["@timestamp", "trace.id", "service.name"];
export declare const ecsOnlyOptionalFields: ["span.id", "span.name", "span.duration.us", "transaction.duration.us", "transaction.id", "transaction.name", "transaction.result", "processor.event", "parent.id", "timestamp.us", "event.outcome", "span.type", "span.subtype", "span.sync", "span.links.trace.id", "agent.name", "faas.coldstart", "span.composite.count", "span.composite.sum.us", "span.composite.compression_strategy", "span.destination.service.resource", "service.environment"];
export declare const optionalFields: ["span.id", "span.name", "span.duration.us", "transaction.duration.us", "transaction.id", "transaction.name", "transaction.result", "processor.event", "parent.id", "timestamp.us", "event.outcome", "span.type", "span.subtype", "span.sync", "span.links.trace.id", "agent.name", "faas.coldstart", "span.composite.count", "span.composite.sum.us", "span.composite.compression_strategy", "span.destination.service.resource", "service.environment", "duration", "status.code", "kind", "links.trace_id", "attributes.http.scheme", "attributes.http.status_code"];
declare function getUnifiedTraceItemsPage({ apmEventClient, size, traceId, start, end, serviceName, searchAfter, ecsOnly, }: {
    apmEventClient: APMEventClient;
    size: number;
    traceId: string;
    start: number;
    end: number;
    serviceName?: string;
    searchAfter?: SortResults;
    ecsOnly: boolean;
}): Promise<{
    hits: import("@kbn/es-types").SearchHit<import("@kbn/apm-types").Span | import("@kbn/apm-types").Transaction, ("@timestamp" | "duration" | "kind" | "span.subtype" | "span.type" | "event.outcome" | "agent.name" | "faas.coldstart" | "service.environment" | "service.name" | "span.id" | "trace.id" | "transaction.id" | "processor.event" | "transaction.name" | "links.trace_id" | "status.code" | "parent.id" | "transaction.duration.us" | "span.name" | "span.duration.us" | "span.destination.service.resource" | "span.links.trace.id" | "timestamp.us" | "transaction.result" | "span.composite.count" | "span.composite.sum.us" | "span.composite.compression_strategy" | "span.sync" | "attributes.http.scheme" | "attributes.http.status_code")[], undefined>[];
    total: number;
}>;
type PageHits = Awaited<ReturnType<typeof getUnifiedTraceItemsPage>>['hits'];
export declare function getUnifiedTraceItemsPaginated({ apmEventClient, maxTraceItems, traceId, start, end, serviceName, ecsOnly, }: {
    apmEventClient: APMEventClient;
    maxTraceItems: number;
    traceId: string;
    start: number;
    end: number;
    serviceName?: string;
    ecsOnly?: boolean;
}): Promise<{
    hits: PageHits;
    total: number;
}>;
export {};
