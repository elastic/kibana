import * as t from 'io-ts';
export declare const suggestionsRouteRepository: Record<"GET /internal/apm/suggestions", import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/suggestions", t.TypeC<{
    query: t.IntersectionC<[t.TypeC<{
        fieldName: t.StringC;
        fieldValue: t.StringC;
    }>, t.TypeC<{
        start: t.Type<number, string, unknown>;
        end: t.Type<number, string, unknown>;
    }>, t.PartialC<{
        serviceName: t.StringC;
    }>]>;
}>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
    terms: string[];
}, import("../typings").APMRouteCreateOptions>>;
