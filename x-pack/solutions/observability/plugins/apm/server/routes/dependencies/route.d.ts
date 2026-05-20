import * as t from 'io-ts';
import type { DependenciesTimeseriesStatisticsResponse } from './get_dependencies_timeseries_statistics';
import type { DependencyLatencyDistributionResponse } from './get_dependency_latency_distribution';
import type { LatencyChartsDependencyResponse } from './get_latency_charts_for_dependency';
import type { MetadataForDependencyResponse } from './get_metadata_for_dependency';
import type { ThroughputChartsForDependencyResponse } from './get_throughput_charts_for_dependency';
import type { TopDependenciesResponse } from './get_top_dependencies';
import type { DependencyOperation } from './get_top_dependency_operations';
import type { DependencySpan } from './get_top_dependency_spans';
import type { UpstreamServicesForDependencyResponse } from './get_upstream_services_for_dependency';
export declare const dependencisRouteRepository: {
    "POST /internal/apm/dependencies/top_dependencies/statistics": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/apm/dependencies/top_dependencies/statistics", t.TypeC<{
        query: t.IntersectionC<[t.IntersectionC<[t.TypeC<{
            environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, t.TypeC<{
            kuery: t.StringC;
        }>, t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>, t.PartialC<{
            offset: t.StringC;
        }>]>, t.TypeC<{
            numBuckets: t.Type<number, number, unknown>;
        }>]>;
        body: t.TypeC<{
            dependencyNames: t.Type<string[], string, unknown>;
        }>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, DependenciesTimeseriesStatisticsResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/dependencies/operations/spans": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/dependencies/operations/spans", t.TypeC<{
        query: t.IntersectionC<[t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>, t.TypeC<{
            environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, t.TypeC<{
            kuery: t.StringC;
        }>, t.TypeC<{
            dependencyName: t.StringC;
            spanName: t.StringC;
        }>, t.PartialC<{
            sampleRangeFrom: t.Type<number, number, unknown>;
            sampleRangeTo: t.Type<number, number, unknown>;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
        spans: DependencySpan[];
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/dependencies/charts/distribution": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/dependencies/charts/distribution", t.TypeC<{
        query: t.IntersectionC<[t.TypeC<{
            dependencyName: t.StringC;
            spanName: t.StringC;
            percentileThreshold: t.Type<number, number, unknown>;
        }>, t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>, t.TypeC<{
            kuery: t.StringC;
        }>, t.TypeC<{
            environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, DependencyLatencyDistributionResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/dependencies/operations": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/dependencies/operations", t.TypeC<{
        query: t.IntersectionC<[t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>, t.TypeC<{
            environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, t.TypeC<{
            kuery: t.StringC;
        }>, t.PartialC<{
            offset: t.StringC;
        }>, t.TypeC<{
            dependencyName: t.StringC;
            searchServiceDestinationMetrics: t.Type<boolean, boolean, unknown>;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
        operations: DependencyOperation[];
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/dependencies/charts/error_rate": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/dependencies/charts/error_rate", t.TypeC<{
        query: t.IntersectionC<[t.TypeC<{
            dependencyName: t.StringC;
            spanName: t.StringC;
            searchServiceDestinationMetrics: t.Type<boolean, boolean, unknown>;
        }>, t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>, t.TypeC<{
            kuery: t.StringC;
        }>, t.TypeC<{
            environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, t.PartialC<{
            offset: t.StringC;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
        currentTimeseries: Array<{
            x: number;
            y: number;
        }>;
        comparisonTimeseries: Array<{
            x: number;
            y: number;
        }> | null;
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/dependencies/charts/throughput": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/dependencies/charts/throughput", t.TypeC<{
        query: t.IntersectionC<[t.TypeC<{
            dependencyName: t.StringC;
            spanName: t.StringC;
            searchServiceDestinationMetrics: t.Type<boolean, boolean, unknown>;
        }>, t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>, t.TypeC<{
            kuery: t.StringC;
        }>, t.TypeC<{
            environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, t.PartialC<{
            offset: t.StringC;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, ThroughputChartsForDependencyResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/dependencies/charts/latency": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/dependencies/charts/latency", t.TypeC<{
        query: t.IntersectionC<[t.TypeC<{
            dependencyName: t.StringC;
            spanName: t.StringC;
            searchServiceDestinationMetrics: t.Type<boolean, boolean, unknown>;
        }>, t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>, t.TypeC<{
            kuery: t.StringC;
        }>, t.TypeC<{
            environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, t.PartialC<{
            offset: t.StringC;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, LatencyChartsDependencyResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/dependencies/metadata": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/dependencies/metadata", t.TypeC<{
        query: t.IntersectionC<[t.TypeC<{
            dependencyName: t.StringC;
        }>, t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
        metadata: MetadataForDependencyResponse;
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/dependencies/upstream_services": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/dependencies/upstream_services", t.IntersectionC<[t.TypeC<{
        query: t.IntersectionC<[t.TypeC<{
            dependencyName: t.StringC;
        }>, t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>, t.TypeC<{
            numBuckets: t.Type<number, number, unknown>;
        }>]>;
    }>, t.PartialC<{
        query: t.IntersectionC<[t.TypeC<{
            environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, t.PartialC<{
            offset: t.StringC;
        }>, t.TypeC<{
            kuery: t.StringC;
        }>]>;
    }>]>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, UpstreamServicesForDependencyResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/dependencies/top_dependencies": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/dependencies/top_dependencies", t.TypeC<{
        query: t.IntersectionC<[t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>, t.TypeC<{
            environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, t.TypeC<{
            kuery: t.StringC;
        }>, t.TypeC<{
            numBuckets: t.Type<number, number, unknown>;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, TopDependenciesResponse, import("../typings").APMRouteCreateOptions>;
};
