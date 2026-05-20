import type * as t from 'io-ts';
import type { SpanLinkDetails } from '@kbn/apm-types';
export declare const spanLinksRouteRepository: {
    "GET /internal/apm/traces/{traceId}/span_links/{spanId}": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/traces/{traceId}/span_links/{spanId}", t.TypeC<{
        path: t.TypeC<{
            traceId: t.StringC;
            spanId: t.StringC;
        }>;
        query: t.IntersectionC<[t.TypeC<{
            kuery: t.StringC;
        }>, t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>, t.PartialC<{
            processorEvent: t.UnionC<[t.LiteralC<import("@kbn/apm-types-shared/src/enums/processor_event").ProcessorEvent.transaction>, t.LiteralC<import("@kbn/apm-types-shared/src/enums/processor_event").ProcessorEvent.error>, t.LiteralC<import("@kbn/apm-types-shared/src/enums/processor_event").ProcessorEvent.metric>, t.LiteralC<import("@kbn/apm-types-shared/src/enums/processor_event").ProcessorEvent.span>]>;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
        outgoingSpanLinks: SpanLinkDetails[];
        incomingSpanLinks: SpanLinkDetails[];
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/traces/{traceId}/span_links/{spanId}/children": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/traces/{traceId}/span_links/{spanId}/children", t.TypeC<{
        path: t.TypeC<{
            traceId: t.StringC;
            spanId: t.StringC;
        }>;
        query: t.IntersectionC<[t.TypeC<{
            kuery: t.StringC;
        }>, t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
        spanLinksDetails: SpanLinkDetails[];
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/traces/{traceId}/span_links/{spanId}/parents": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/traces/{traceId}/span_links/{spanId}/parents", t.TypeC<{
        path: t.TypeC<{
            traceId: t.StringC;
            spanId: t.StringC;
        }>;
        query: t.IntersectionC<[t.TypeC<{
            kuery: t.StringC;
        }>, t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>, t.TypeC<{
            processorEvent: t.UnionC<[t.LiteralC<import("@kbn/apm-types-shared/src/enums/processor_event").ProcessorEvent.transaction>, t.LiteralC<import("@kbn/apm-types-shared/src/enums/processor_event").ProcessorEvent.error>, t.LiteralC<import("@kbn/apm-types-shared/src/enums/processor_event").ProcessorEvent.metric>, t.LiteralC<import("@kbn/apm-types-shared/src/enums/processor_event").ProcessorEvent.span>]>;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
        spanLinksDetails: SpanLinkDetails[];
    }, import("../typings").APMRouteCreateOptions>;
};
