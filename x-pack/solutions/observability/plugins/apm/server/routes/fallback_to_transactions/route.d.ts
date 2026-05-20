import type * as t from 'io-ts';
export declare const fallbackToTransactionsRouteRepository: Record<"GET /internal/apm/fallback_to_transactions", import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/fallback_to_transactions", t.PartialC<{
    query: t.IntersectionC<[t.TypeC<{
        kuery: t.StringC;
    }>, t.PartialC<{
        start: t.Type<number, string, unknown>;
        end: t.Type<number, string, unknown>;
    }>]>;
}>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
    fallbackToTransactions: boolean;
}, import("../typings").APMRouteCreateOptions>>;
