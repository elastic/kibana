import * as t from 'io-ts';
import { LatencyDistributionChartType } from '../../../common/latency_distribution_chart_types';
import type { OverallLatencyDistributionResponse } from './types';
export declare const latencyDistributionRouteRepository: Record<"POST /internal/apm/latency/overall_distribution/transactions", import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/apm/latency/overall_distribution/transactions", t.TypeC<{
    body: t.IntersectionC<[t.PartialC<{
        serviceName: t.StringC;
        transactionName: t.StringC;
        transactionType: t.StringC;
        termFilters: t.ArrayC<t.TypeC<{
            fieldName: t.StringC;
            fieldValue: t.UnionC<[t.StringC, t.Type<number, number, unknown>]>;
        }>>;
        durationMin: t.Type<number, number, unknown>;
        durationMax: t.Type<number, number, unknown>;
    }>, t.TypeC<{
        environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
    }>, t.TypeC<{
        kuery: t.StringC;
    }>, t.TypeC<{
        start: t.Type<number, string, unknown>;
        end: t.Type<number, string, unknown>;
    }>, t.TypeC<{
        percentileThreshold: t.Type<number, number, unknown>;
        chartType: t.UnionC<[t.LiteralC<LatencyDistributionChartType.transactionLatency>, t.LiteralC<LatencyDistributionChartType.spanLatency>, t.LiteralC<LatencyDistributionChartType.latencyCorrelations>, t.LiteralC<LatencyDistributionChartType.failedTransactionsCorrelations>, t.LiteralC<LatencyDistributionChartType.dependencyLatency>]>;
    }>]>;
}>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, OverallLatencyDistributionResponse, import("../typings").APMRouteCreateOptions>>;
