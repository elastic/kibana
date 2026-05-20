import * as t from 'io-ts';
export declare const eventMetadataRouteRepository: Record<"GET /internal/apm/event_metadata/{processorEvent}/{id}", import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/event_metadata/{processorEvent}/{id}", t.TypeC<{
    path: t.TypeC<{
        processorEvent: t.UnionC<[t.LiteralC<import("@kbn/apm-types-shared/src/enums/processor_event").ProcessorEvent.transaction>, t.LiteralC<import("@kbn/apm-types-shared/src/enums/processor_event").ProcessorEvent.error>, t.LiteralC<import("@kbn/apm-types-shared/src/enums/processor_event").ProcessorEvent.metric>, t.LiteralC<import("@kbn/apm-types-shared/src/enums/processor_event").ProcessorEvent.span>]>;
        id: t.StringC;
    }>;
    query: t.TypeC<{
        start: t.Type<number, string, unknown>;
        end: t.Type<number, string, unknown>;
    }>;
}>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
    metadata: Partial<Record<string, unknown[]>>;
}, import("../typings").APMRouteCreateOptions>>;
