import type * as t from 'io-ts';
import type { ObservabilityOverviewResponse } from './get_observability_overview_data';
import type { HasDataResponse } from './has_data';
export declare const observabilityOverviewRouteRepository: {
    "GET /internal/apm/observability_overview/has_data": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/observability_overview/has_data", undefined, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, HasDataResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/observability_overview": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/observability_overview", t.TypeC<{
        query: t.IntersectionC<[t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>, t.TypeC<{
            bucketSize: t.Type<number, number, unknown>;
            intervalString: t.StringC;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, ObservabilityOverviewResponse, import("../typings").APMRouteCreateOptions>;
};
