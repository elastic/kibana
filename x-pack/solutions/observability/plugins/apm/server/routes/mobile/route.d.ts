import type * as t from 'io-ts';
import type { HttpRequestsTimeseries } from './get_mobile_http_requests';
import type { MobileFiltersResponse } from './get_mobile_filters';
import type { SessionsTimeseries } from './get_mobile_sessions';
import type { MobilePeriodStats } from './get_mobile_stats';
import type { MobileLocationStats } from './get_mobile_location_stats';
import type { MobileTermsByFieldResponse } from './get_mobile_terms_by_field';
import type { MobileMainStatisticsResponse } from './get_mobile_main_statistics_by_field';
import type { MobileDetailedStatisticsResponse } from './get_mobile_detailed_statistics_by_field';
import type { MobilePropertyType } from '../../../common/mobile_types';
import type { MobileMostUsedChartResponse } from './get_mobile_most_used_charts';
export declare const mobileRouteRepository: {
    "GET /internal/apm/mobile-services/{serviceName}/detailed_statistics": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/mobile-services/{serviceName}/detailed_statistics", t.TypeC<{
        path: t.TypeC<{
            serviceName: t.StringC;
        }>;
        query: t.IntersectionC<[t.TypeC<{
            kuery: t.StringC;
        }>, t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>, t.PartialC<{
            offset: t.StringC;
        }>, t.TypeC<{
            environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, t.TypeC<{
            field: t.StringC;
            fieldValues: t.Type<string[], string, unknown>;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, MobileDetailedStatisticsResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/mobile-services/{serviceName}/main_statistics": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/mobile-services/{serviceName}/main_statistics", t.TypeC<{
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
            field: t.StringC;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, MobileMainStatisticsResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/mobile-services/{serviceName}/terms": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/mobile-services/{serviceName}/terms", t.TypeC<{
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
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
        terms: MobileTermsByFieldResponse;
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/mobile-services/{serviceName}/location/stats": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/mobile-services/{serviceName}/location/stats", t.TypeC<{
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
        }>, t.PartialC<{
            offset: t.StringC;
        }>, t.PartialC<{
            locationField: t.StringC;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, MobileLocationStats, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/mobile-services/{serviceName}/stats": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/mobile-services/{serviceName}/stats", t.TypeC<{
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
        }>, t.PartialC<{
            offset: t.StringC;
        }>, t.PartialC<{
            transactionType: t.StringC;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, MobilePeriodStats, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/mobile-services/{serviceName}/transactions/charts/http_requests": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/mobile-services/{serviceName}/transactions/charts/http_requests", t.TypeC<{
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
        }>, t.PartialC<{
            offset: t.StringC;
        }>, t.PartialC<{
            transactionType: t.StringC;
            transactionName: t.StringC;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, HttpRequestsTimeseries, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/mobile-services/{serviceName}/transactions/charts/sessions": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/mobile-services/{serviceName}/transactions/charts/sessions", t.TypeC<{
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
        }>, t.PartialC<{
            offset: t.StringC;
        }>, t.PartialC<{
            transactionType: t.StringC;
            transactionName: t.StringC;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, SessionsTimeseries, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/mobile-services/{serviceName}/most_used_charts": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/mobile-services/{serviceName}/most_used_charts", t.TypeC<{
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
        }>, t.PartialC<{
            transactionType: t.StringC;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
        mostUsedCharts: Array<{
            key: MobilePropertyType;
            options: MobileMostUsedChartResponse[number]["options"];
        }>;
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/mobile/filters": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/services/{serviceName}/mobile/filters", t.TypeC<{
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
        }>, t.PartialC<{
            transactionType: t.StringC;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
        mobileFilters: MobileFiltersResponse;
    }, import("../typings").APMRouteCreateOptions>;
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
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, import("./crashes/distribution/get_distribution").CrashDistributionResponse, import("../typings").APMRouteCreateOptions>;
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
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
        errorGroups: import("./crashes/get_crash_groups/get_crash_group_main_statistics").MobileCrashGroupMainStatisticsResponse;
    }, import("../typings").APMRouteCreateOptions>;
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
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, import("./crashes/get_mobile_crash_group_detailed_statistics").MobileCrashesGroupPeriodsResponse, import("../typings").APMRouteCreateOptions>;
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
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
        terms: import("./errors/get_mobile_errors_terms_by_field").MobileErrorTermsByFieldResponse;
    }, import("../typings").APMRouteCreateOptions>;
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
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, import("./errors/get_mobile_error_group_detailed_statistics").MobileErrorGroupPeriodsResponse, import("../typings").APMRouteCreateOptions>;
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
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
        errorGroups: import("./errors/get_mobile_error_group_main_statistics").MobileErrorGroupMainStatisticsResponse;
    }, import("../typings").APMRouteCreateOptions>;
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
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, import("./errors/get_mobile_http_errors").MobileHttpErrorsTimeseries, import("../typings").APMRouteCreateOptions>;
};
