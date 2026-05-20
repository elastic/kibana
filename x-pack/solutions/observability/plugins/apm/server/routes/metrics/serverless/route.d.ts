import * as t from 'io-ts';
import type { ActiveInstanceOverview } from './get_active_instances_overview';
import type { ServerlessFunctionsOverviewResponse } from './get_serverless_functions_overview';
import type { ServerlessSummaryResponse } from './get_serverless_summary';
import type { FetchAndTransformMetrics } from '../fetch_and_transform_metrics';
import type { Coordinate } from '../../../../typings/timeseries';
export declare const metricsServerlessRouteRepository: {
    "GET /internal/apm/services/{serviceName}/metrics/serverless/active_instances": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/services/{serviceName}/metrics/serverless/active_instances", t.TypeC<{
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
            serverlessId: t.StringC;
        }>]>;
    }>, import("../../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
        activeInstances: ActiveInstanceOverview[];
        timeseries: Coordinate[];
    }, import("../../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/metrics/serverless/functions_overview": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/services/{serviceName}/metrics/serverless/functions_overview", t.TypeC<{
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
        }>]>;
    }>, import("../../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
        serverlessFunctionsOverview: ServerlessFunctionsOverviewResponse;
    }, import("../../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/metrics/serverless/summary": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/services/{serviceName}/metrics/serverless/summary", t.TypeC<{
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
            serverlessId: t.StringC;
        }>]>;
    }>, import("../../apm_routes/register_apm_server_routes").APMRouteHandlerResources, ServerlessSummaryResponse, import("../../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/metrics/serverless/charts": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/services/{serviceName}/metrics/serverless/charts", t.TypeC<{
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
            serverlessId: t.StringC;
        }>, t.IntersectionC<[t.TypeC<{
            documentType: t.UnionC<[t.LiteralC<import("../../../../common/document_type").ApmDocumentType.TransactionMetric>, t.LiteralC<import("../../../../common/document_type").ApmDocumentType.TransactionEvent>]>;
            rollupInterval: t.UnionC<[t.LiteralC<import("../../../../common/rollup").RollupInterval.OneMinute>, t.LiteralC<import("../../../../common/rollup").RollupInterval.TenMinutes>, t.LiteralC<import("../../../../common/rollup").RollupInterval.SixtyMinutes>, t.LiteralC<import("../../../../common/rollup").RollupInterval.None>]>;
        }>, t.TypeC<{
            bucketSizeInSeconds: t.Type<number, number, unknown>;
        }>]>]>;
    }>, import("../../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
        charts: FetchAndTransformMetrics[];
    }, import("../../typings").APMRouteCreateOptions>;
};
