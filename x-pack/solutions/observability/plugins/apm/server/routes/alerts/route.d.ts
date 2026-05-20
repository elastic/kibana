import type * as t from 'io-ts';
import type { Coordinate } from '../../../typings/timeseries';
import type { AggregationType } from '../../../common/rules/apm_rule_types';
declare const alertParamsRt: t.IntersectionC<[t.PartialC<{
    aggregationType: t.UnionC<[t.LiteralC<AggregationType.Avg>, t.LiteralC<AggregationType.P95>, t.LiteralC<AggregationType.P99>]>;
    serviceName: t.StringC;
    errorGroupingKey: t.StringC;
    transactionType: t.StringC;
    transactionName: t.StringC;
}>, t.TypeC<{
    environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
}>, t.TypeC<{
    start: t.Type<number, string, unknown>;
    end: t.Type<number, string, unknown>;
}>, t.TypeC<{
    interval: t.StringC;
}>, t.PartialC<{
    groupBy: t.ArrayC<t.StringC>;
    searchConfiguration: t.Type<{
        query: {
            query: string | {
                [x: string]: any;
            };
            language: string;
        };
    }, string, unknown>;
}>]>;
export interface PreviewChartResponseItem {
    name: string;
    data: Coordinate[];
}
export interface PreviewChartResponse {
    series: PreviewChartResponseItem[];
    totalGroups: number;
}
export type AlertParams = t.TypeOf<typeof alertParamsRt>;
export declare const alertsChartPreviewRouteRepository: {
    "GET /internal/apm/rule_types/transaction_duration/chart_preview": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/rule_types/transaction_duration/chart_preview", t.TypeC<{
        query: t.IntersectionC<[t.PartialC<{
            aggregationType: t.UnionC<[t.LiteralC<AggregationType.Avg>, t.LiteralC<AggregationType.P95>, t.LiteralC<AggregationType.P99>]>;
            serviceName: t.StringC;
            errorGroupingKey: t.StringC;
            transactionType: t.StringC;
            transactionName: t.StringC;
        }>, t.TypeC<{
            environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>, t.TypeC<{
            interval: t.StringC;
        }>, t.PartialC<{
            groupBy: t.ArrayC<t.StringC>;
            searchConfiguration: t.Type<{
                query: {
                    query: string | {
                        [x: string]: any;
                    };
                    language: string;
                };
            }, string, unknown>;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
        latencyChartPreview: PreviewChartResponse;
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/rule_types/error_count/chart_preview": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/rule_types/error_count/chart_preview", t.TypeC<{
        query: t.IntersectionC<[t.PartialC<{
            aggregationType: t.UnionC<[t.LiteralC<AggregationType.Avg>, t.LiteralC<AggregationType.P95>, t.LiteralC<AggregationType.P99>]>;
            serviceName: t.StringC;
            errorGroupingKey: t.StringC;
            transactionType: t.StringC;
            transactionName: t.StringC;
        }>, t.TypeC<{
            environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>, t.TypeC<{
            interval: t.StringC;
        }>, t.PartialC<{
            groupBy: t.ArrayC<t.StringC>;
            searchConfiguration: t.Type<{
                query: {
                    query: string | {
                        [x: string]: any;
                    };
                    language: string;
                };
            }, string, unknown>;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
        errorCountChartPreview: PreviewChartResponse;
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/rule_types/transaction_error_rate/chart_preview": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/rule_types/transaction_error_rate/chart_preview", t.TypeC<{
        query: t.IntersectionC<[t.PartialC<{
            aggregationType: t.UnionC<[t.LiteralC<AggregationType.Avg>, t.LiteralC<AggregationType.P95>, t.LiteralC<AggregationType.P99>]>;
            serviceName: t.StringC;
            errorGroupingKey: t.StringC;
            transactionType: t.StringC;
            transactionName: t.StringC;
        }>, t.TypeC<{
            environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>, t.TypeC<{
            interval: t.StringC;
        }>, t.PartialC<{
            groupBy: t.ArrayC<t.StringC>;
            searchConfiguration: t.Type<{
                query: {
                    query: string | {
                        [x: string]: any;
                    };
                    language: string;
                };
            }, string, unknown>;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
        errorRateChartPreview: PreviewChartResponse;
    }, import("../typings").APMRouteCreateOptions>;
};
export {};
