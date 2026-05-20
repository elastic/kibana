import * as t from 'io-ts';
import { IndexLifecyclePhaseSelectOption } from '../../../common/storage_explorer_types';
import type { StorageExplorerServiceStatisticsResponse } from './get_service_statistics';
import type { SizeTimeseriesResponse } from './get_size_timeseries';
import type { StorageDetailsResponse } from './get_storage_details';
import type { StorageExplorerSummaryStatisticsResponse } from './get_summary_statistics';
export declare const storageExplorerRouteRepository: {
    "GET /internal/apm/storage_explorer/get_services": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/storage_explorer/get_services", t.TypeC<{
        query: t.IntersectionC<[t.TypeC<{
            indexLifecyclePhase: t.UnionC<[t.LiteralC<IndexLifecyclePhaseSelectOption.All>, t.LiteralC<IndexLifecyclePhaseSelectOption.Hot>, t.LiteralC<IndexLifecyclePhaseSelectOption.Warm>, t.LiteralC<IndexLifecyclePhaseSelectOption.Cold>, t.LiteralC<IndexLifecyclePhaseSelectOption.Frozen>]>;
        }>, t.TypeC<{
            environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, t.TypeC<{
            kuery: t.StringC;
        }>, t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
        services: Array<{
            serviceName: string;
        }>;
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/storage_explorer/is_cross_cluster_search": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/storage_explorer/is_cross_cluster_search", undefined, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
        isCrossClusterSearch: boolean;
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/storage_explorer_summary_stats": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/storage_explorer_summary_stats", t.TypeC<{
        query: t.IntersectionC<[t.TypeC<{
            indexLifecyclePhase: t.UnionC<[t.LiteralC<IndexLifecyclePhaseSelectOption.All>, t.LiteralC<IndexLifecyclePhaseSelectOption.Hot>, t.LiteralC<IndexLifecyclePhaseSelectOption.Warm>, t.LiteralC<IndexLifecyclePhaseSelectOption.Cold>, t.LiteralC<IndexLifecyclePhaseSelectOption.Frozen>]>;
        }>, t.TypeC<{
            probability: t.Type<number, number, unknown>;
        }>, t.TypeC<{
            environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, t.TypeC<{
            kuery: t.StringC;
        }>, t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, StorageExplorerSummaryStatisticsResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/storage_explorer/privileges": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/storage_explorer/privileges", undefined, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
        hasPrivileges: boolean;
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/storage_chart": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/storage_chart", t.TypeC<{
        query: t.IntersectionC<[t.TypeC<{
            indexLifecyclePhase: t.UnionC<[t.LiteralC<IndexLifecyclePhaseSelectOption.All>, t.LiteralC<IndexLifecyclePhaseSelectOption.Hot>, t.LiteralC<IndexLifecyclePhaseSelectOption.Warm>, t.LiteralC<IndexLifecyclePhaseSelectOption.Cold>, t.LiteralC<IndexLifecyclePhaseSelectOption.Frozen>]>;
        }>, t.TypeC<{
            probability: t.Type<number, number, unknown>;
        }>, t.TypeC<{
            environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, t.TypeC<{
            kuery: t.StringC;
        }>, t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
        storageTimeSeries: SizeTimeseriesResponse;
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/storage_details": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/services/{serviceName}/storage_details", t.TypeC<{
        path: t.TypeC<{
            serviceName: t.StringC;
        }>;
        query: t.IntersectionC<[t.TypeC<{
            indexLifecyclePhase: t.UnionC<[t.LiteralC<IndexLifecyclePhaseSelectOption.All>, t.LiteralC<IndexLifecyclePhaseSelectOption.Hot>, t.LiteralC<IndexLifecyclePhaseSelectOption.Warm>, t.LiteralC<IndexLifecyclePhaseSelectOption.Cold>, t.LiteralC<IndexLifecyclePhaseSelectOption.Frozen>]>;
        }>, t.TypeC<{
            probability: t.Type<number, number, unknown>;
        }>, t.TypeC<{
            environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, t.TypeC<{
            kuery: t.StringC;
        }>, t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, StorageDetailsResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/storage_explorer": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/storage_explorer", t.TypeC<{
        query: t.IntersectionC<[t.TypeC<{
            indexLifecyclePhase: t.UnionC<[t.LiteralC<IndexLifecyclePhaseSelectOption.All>, t.LiteralC<IndexLifecyclePhaseSelectOption.Hot>, t.LiteralC<IndexLifecyclePhaseSelectOption.Warm>, t.LiteralC<IndexLifecyclePhaseSelectOption.Cold>, t.LiteralC<IndexLifecyclePhaseSelectOption.Frozen>]>;
        }>, t.TypeC<{
            probability: t.Type<number, number, unknown>;
        }>, t.TypeC<{
            environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, t.TypeC<{
            kuery: t.StringC;
        }>, t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
        serviceStatistics: StorageExplorerServiceStatisticsResponse;
    }, import("../typings").APMRouteCreateOptions>;
};
