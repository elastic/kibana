import * as t from 'io-ts';
import type { MobileErrorGroupPeriodsResponse } from './get_mobile_error_group_detailed_statistics';
import type { MobileErrorGroupMainStatisticsResponse } from './get_mobile_error_group_main_statistics';
import type { MobileErrorTermsByFieldResponse } from './get_mobile_errors_terms_by_field';
import type { MobileHttpErrorsTimeseries } from './get_mobile_http_errors';
export declare const mobileErrorRoutes: {
    "GET /internal/apm/mobile-services/{serviceName}/error_terms": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/mobile-services/{serviceName}/error_terms", t.TypeC<{
        path: t.TypeC<{
            serviceName: t.StringC;
        }>;
        query: t.IntersectionC<[t.TypeC<{
            kuery: t.StringC;
        }>, t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>, t.TypeC<{
            environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, t.TypeC<{
            size: t.Type<number, number, unknown>;
            fieldName: t.StringC;
        }>]>;
    }>, import("../../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
        terms: MobileErrorTermsByFieldResponse;
    }, import("../../typings").APMRouteCreateOptions>;
    "POST /internal/apm/mobile-services/{serviceName}/errors/groups/detailed_statistics": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/apm/mobile-services/{serviceName}/errors/groups/detailed_statistics", t.TypeC<{
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
    }>, import("../../apm_routes/register_apm_server_routes").APMRouteHandlerResources, MobileErrorGroupPeriodsResponse, import("../../typings").APMRouteCreateOptions>;
    "GET /internal/apm/mobile-services/{serviceName}/errors/groups/main_statistics": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/mobile-services/{serviceName}/errors/groups/main_statistics", t.TypeC<{
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
        errorGroups: MobileErrorGroupMainStatisticsResponse;
    }, import("../../typings").APMRouteCreateOptions>;
    "GET /internal/apm/mobile-services/{serviceName}/error/http_error_rate": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/mobile-services/{serviceName}/error/http_error_rate", t.TypeC<{
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
        }>]>;
    }>, import("../../apm_routes/register_apm_server_routes").APMRouteHandlerResources, MobileHttpErrorsTimeseries, import("../../typings").APMRouteCreateOptions>;
};
