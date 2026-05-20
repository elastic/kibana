import * as t from 'io-ts';
import type { Environment } from '../../../common/environment_rt';
export declare const environmentsRouteRepository: Record<"GET /internal/apm/environments", import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/environments", t.TypeC<{
    query: t.IntersectionC<[t.PartialC<{
        serviceName: t.StringC;
    }>, t.TypeC<{
        start: t.Type<number, string, unknown>;
        end: t.Type<number, string, unknown>;
    }>]>;
}>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
    environments: Environment[];
}, import("../typings").APMRouteCreateOptions>>;
