import type * as t from 'io-ts';
import type { OverallLatencyDistributionResponse } from '../latency_distribution/types';
export declare const spanLatencyDistributionRouteRepository: Record<"POST /internal/apm/latency/overall_distribution/spans", import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/apm/latency/overall_distribution/spans", t.TypeC<{
    body: t.IntersectionC<[t.PartialC<{
        serviceName: t.StringC;
        spanName: t.StringC;
        transactionId: t.StringC;
        termFilters: t.ArrayC<t.TypeC<{
            fieldName: t.StringC;
            fieldValue: t.UnionC<[t.StringC, t.Type<number, number, unknown>]>;
        }>>;
        durationMin: t.Type<number, number, unknown>;
        durationMax: t.Type<number, number, unknown>;
        isOtel: t.BooleanC;
    }>, t.TypeC<{
        environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
    }>, t.TypeC<{
        kuery: t.StringC;
    }>, t.TypeC<{
        start: t.Type<number, string, unknown>;
        end: t.Type<number, string, unknown>;
    }>, t.TypeC<{
        percentileThreshold: t.Type<number, number, unknown>;
        chartType: t.UnionC<[t.LiteralC<import("../../../common/latency_distribution_chart_types").LatencyDistributionChartType.transactionLatency>, t.LiteralC<import("../../../common/latency_distribution_chart_types").LatencyDistributionChartType.spanLatency>, t.LiteralC<import("../../../common/latency_distribution_chart_types").LatencyDistributionChartType.latencyCorrelations>, t.LiteralC<import("../../../common/latency_distribution_chart_types").LatencyDistributionChartType.failedTransactionsCorrelations>, t.LiteralC<import("../../../common/latency_distribution_chart_types").LatencyDistributionChartType.dependencyLatency>]>;
    }>]>;
}>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, OverallLatencyDistributionResponse, import("../typings").APMRouteCreateOptions>>;
