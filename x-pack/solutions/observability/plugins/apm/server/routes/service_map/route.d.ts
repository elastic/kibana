import type * as t from 'io-ts';
import type { ServiceMapResponse } from '../../../common/service_map';
import type { ServiceMapServiceDependencyInfoResponse } from './get_service_map_dependency_node_info';
import type { ServiceMapServiceNodeInfoResponse } from './get_service_map_service_node_info';
import { type ServiceMapServiceBadgesResponse } from './get_service_map_service_badges';
export declare const serviceMapRouteRepository: {
    "POST /internal/apm/service-map/service_badges": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/apm/service-map/service_badges", t.TypeC<{
        query: t.IntersectionC<[t.TypeC<{
            environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>, t.PartialC<{
            kuery: t.StringC;
        }>]>;
        body: t.TypeC<{
            serviceNames: t.Type<string[], string, unknown>;
        }>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, ServiceMapServiceBadgesResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/service-map/dependency": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/service-map/dependency", t.TypeC<{
        query: t.IntersectionC<[t.TypeC<{
            dependencies: t.UnionC<[t.StringC, t.ArrayC<t.StringC>]>;
        }>, t.PartialC<{
            sourceServiceName: t.StringC;
        }>, t.TypeC<{
            environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>, t.PartialC<{
            offset: t.StringC;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, ServiceMapServiceDependencyInfoResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/service-map/service/{serviceName}": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/service-map/service/{serviceName}", t.TypeC<{
        path: t.TypeC<{
            serviceName: t.StringC;
        }>;
        query: t.IntersectionC<[t.TypeC<{
            environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>, t.PartialC<{
            offset: t.StringC;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, ServiceMapServiceNodeInfoResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/service-map": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/service-map", t.TypeC<{
        query: t.IntersectionC<[t.PartialC<{
            serviceName: t.StringC;
            serviceGroup: t.StringC;
            kuery: t.StringC;
            esQuery: t.Type<any, string, unknown>;
        }>, t.TypeC<{
            environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, ServiceMapResponse, import("../typings").APMRouteCreateOptions>;
};
