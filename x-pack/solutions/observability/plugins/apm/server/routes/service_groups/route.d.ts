import * as t from 'io-ts';
import type { LookupServicesResponse } from './lookup_services';
import type { SavedServiceGroup } from '../../../common/service_groups';
type ServiceGroupCounts = Record<string, {
    services: number;
    alerts: number;
}>;
export declare const serviceGroupRouteRepository: {
    "GET /internal/apm/service-group/counts": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/service-group/counts", undefined, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, ServiceGroupCounts, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/service-group/services": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/service-group/services", t.TypeC<{
        query: t.IntersectionC<[t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>, t.PartialC<{
            kuery: t.StringC;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
        items: LookupServicesResponse;
    }, import("../typings").APMRouteCreateOptions>;
    "DELETE /internal/apm/service-group": import("@kbn/server-route-repository-utils").ServerRoute<"DELETE /internal/apm/service-group", t.TypeC<{
        query: t.TypeC<{
            serviceGroupId: t.StringC;
        }>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, void, import("../typings").APMRouteCreateOptions>;
    "POST /internal/apm/service-group": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/apm/service-group", t.TypeC<{
        query: t.UnionC<[t.PartialC<{
            serviceGroupId: t.StringC;
        }>, t.UndefinedC]>;
        body: t.TypeC<{
            groupName: t.StringC;
            kuery: t.StringC;
            description: t.UnionC<[t.StringC, t.UndefinedC]>;
            color: t.UnionC<[t.StringC, t.UndefinedC]>;
        }>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, SavedServiceGroup, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/service-group": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/service-group", t.TypeC<{
        query: t.TypeC<{
            serviceGroup: t.StringC;
        }>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
        serviceGroup: SavedServiceGroup;
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/service-groups": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/service-groups", undefined, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
        serviceGroups: SavedServiceGroup[];
    }, import("../typings").APMRouteCreateOptions>;
};
export {};
