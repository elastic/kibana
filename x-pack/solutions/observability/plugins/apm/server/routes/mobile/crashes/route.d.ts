import type * as t from 'io-ts';
import type { MobileCrashGroupMainStatisticsResponse } from './get_crash_groups/get_crash_group_main_statistics';
import type { MobileCrashesGroupPeriodsResponse } from './get_mobile_crash_group_detailed_statistics';
import type { CrashDistributionResponse } from './distribution/get_distribution';
export declare const mobileCrashRoutes: {
    "GET /internal/apm/mobile-services/{serviceName}/crashes/distribution": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/mobile-services/{serviceName}/crashes/distribution", t.TypeC<{
        path: t.TypeC<{
            serviceName: t.StringC;
        }>;
        query: t.IntersectionC<[t.PartialC<{
            groupId: t.StringC;
        }>, t.TypeC<{
            environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, t.TypeC<{
            kuery: t.StringC;
        }>, t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>, t.PartialC<{
            offset: t.StringC;
        }>]>;
    }>, import("../../apm_routes/register_apm_server_routes").APMRouteHandlerResources, CrashDistributionResponse, import("../../typings").APMRouteCreateOptions>;
    "GET /internal/apm/mobile-services/{serviceName}/crashes/groups/main_statistics": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/mobile-services/{serviceName}/crashes/groups/main_statistics", t.TypeC<{
        path: t.TypeC<{
            serviceName: t.StringC;
        }>;
        query: t.IntersectionC<[t.PartialC<{
            sortField: t.StringC;
            sortDirection: t.UnionC<[t.LiteralC<"asc">, t.LiteralC<"desc">]>;
        }>, t.TypeC<{
            environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, t.TypeC<{
            kuery: t.StringC;
        }>, t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>]>;
    }>, import("../../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
        errorGroups: MobileCrashGroupMainStatisticsResponse;
    }, import("../../typings").APMRouteCreateOptions>;
    "POST /internal/apm/mobile-services/{serviceName}/crashes/groups/detailed_statistics": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/apm/mobile-services/{serviceName}/crashes/groups/detailed_statistics", t.TypeC<{
        path: t.TypeC<{
            serviceName: t.StringC;
        }>;
        query: t.IntersectionC<[t.TypeC<{
            environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, t.TypeC<{
            kuery: t.StringC;
        }>, t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>, t.PartialC<{
            offset: t.StringC;
        }>, t.TypeC<{
            numBuckets: t.Type<number, number, unknown>;
        }>]>;
        body: t.TypeC<{
            groupIds: t.Type<string[], string, unknown>;
        }>;
    }>, import("../../apm_routes/register_apm_server_routes").APMRouteHandlerResources, MobileCrashesGroupPeriodsResponse, import("../../typings").APMRouteCreateOptions>;
};
