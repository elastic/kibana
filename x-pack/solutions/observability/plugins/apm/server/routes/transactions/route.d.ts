import type * as t from 'io-ts';
import type { LatencyAggregationType } from '../../../common/latency_aggregation_types';
import type { ColdstartRateResponse } from '../../lib/transaction_groups/get_coldstart_rate';
import type { ServiceTransactionGroupsResponse } from '../services/get_service_transaction_groups';
import type { ServiceTransactionGroupDetailedStatisticsResponse } from '../services/get_service_transaction_group_detailed_statistics';
import type { TransactionBreakdownResponse } from './breakdown';
import type { FailedTransactionRateResponse } from './get_failed_transaction_rate_periods';
import type { TransactionLatencyResponse } from './get_latency_charts';
import type { TransactionTraceSamplesResponse } from './trace_samples';
export interface MergedServiceTransactionGroupsResponse extends Omit<ServiceTransactionGroupsResponse, 'transactionGroups'> {
    transactionGroups: Array<{
        alertsCount: number;
        name: string;
        transactionType?: string;
        latency?: number | null;
        throughput?: number;
        errorRate?: number;
        impact?: number;
    }>;
}
export declare const transactionRouteRepository: {
    "GET /internal/apm/services/{serviceName}/transactions/charts/coldstart_rate_by_transaction_name": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/services/{serviceName}/transactions/charts/coldstart_rate_by_transaction_name", t.TypeC<{
        path: t.TypeC<{
            serviceName: t.StringC;
        }>;
        query: t.IntersectionC<[t.TypeC<{
            transactionType: t.StringC;
            transactionName: t.StringC;
        }>, t.IntersectionC<[t.TypeC<{
            environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, t.TypeC<{
            kuery: t.StringC;
        }>, t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>, t.PartialC<{
            offset: t.StringC;
        }>]>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, ColdstartRateResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/transactions/charts/coldstart_rate": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/services/{serviceName}/transactions/charts/coldstart_rate", t.TypeC<{
        path: t.TypeC<{
            serviceName: t.StringC;
        }>;
        query: t.IntersectionC<[t.TypeC<{
            transactionType: t.StringC;
        }>, t.IntersectionC<[t.TypeC<{
            environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, t.TypeC<{
            kuery: t.StringC;
        }>, t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>, t.PartialC<{
            offset: t.StringC;
        }>]>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, ColdstartRateResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/transactions/charts/error_rate": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/services/{serviceName}/transactions/charts/error_rate", t.TypeC<{
        path: t.TypeC<{
            serviceName: t.StringC;
        }>;
        query: t.IntersectionC<[t.TypeC<{
            transactionType: t.StringC;
            bucketSizeInSeconds: t.Type<number, number, unknown>;
        }>, t.PartialC<{
            transactionName: t.StringC;
            filters: t.Type<import("@kbn/es-query").BoolQuery, string, unknown>;
        }>, t.IntersectionC<[t.TypeC<{
            environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, t.TypeC<{
            kuery: t.StringC;
        }>, t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>, t.PartialC<{
            offset: t.StringC;
        }>, t.TypeC<{
            documentType: t.UnionC<[t.LiteralC<import("../../../common/document_type").ApmDocumentType.ServiceTransactionMetric>, t.LiteralC<import("../../../common/document_type").ApmDocumentType.TransactionMetric>, t.LiteralC<import("../../../common/document_type").ApmDocumentType.TransactionEvent>]>;
            rollupInterval: t.UnionC<[t.LiteralC<import("../../../common/rollup").RollupInterval.OneMinute>, t.LiteralC<import("../../../common/rollup").RollupInterval.TenMinutes>, t.LiteralC<import("../../../common/rollup").RollupInterval.SixtyMinutes>, t.LiteralC<import("../../../common/rollup").RollupInterval.None>]>;
        }>]>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, FailedTransactionRateResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/transaction/charts/breakdown": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/services/{serviceName}/transaction/charts/breakdown", t.TypeC<{
        path: t.TypeC<{
            serviceName: t.StringC;
        }>;
        query: t.IntersectionC<[t.TypeC<{
            transactionType: t.StringC;
        }>, t.PartialC<{
            transactionName: t.StringC;
        }>, t.TypeC<{
            environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, t.TypeC<{
            kuery: t.StringC;
        }>, t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, TransactionBreakdownResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/transactions/traces/samples": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/services/{serviceName}/transactions/traces/samples", t.TypeC<{
        path: t.TypeC<{
            serviceName: t.StringC;
        }>;
        query: t.IntersectionC<[t.TypeC<{
            transactionType: t.StringC;
            transactionName: t.StringC;
        }>, t.PartialC<{
            transactionId: t.StringC;
            traceId: t.StringC;
            sampleRangeFrom: t.Type<number, number, unknown>;
            sampleRangeTo: t.Type<number, number, unknown>;
        }>, t.TypeC<{
            environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, t.TypeC<{
            kuery: t.StringC;
        }>, t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, TransactionTraceSamplesResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/transactions/charts/latency": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/services/{serviceName}/transactions/charts/latency", t.TypeC<{
        path: t.TypeC<{
            serviceName: t.StringC;
        }>;
        query: t.IntersectionC<[t.TypeC<{
            latencyAggregationType: t.UnionC<[t.LiteralC<LatencyAggregationType.avg>, t.LiteralC<LatencyAggregationType.p95>, t.LiteralC<LatencyAggregationType.p99>]>;
            bucketSizeInSeconds: t.Type<number, number, unknown>;
            useDurationSummary: t.Type<boolean, boolean, unknown>;
        }>, t.PartialC<{
            transactionType: t.StringC;
            transactionName: t.StringC;
            filters: t.Type<import("@kbn/es-query").BoolQuery, string, unknown>;
        }>, t.IntersectionC<[t.TypeC<{
            environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, t.TypeC<{
            kuery: t.StringC;
        }>, t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>, t.PartialC<{
            offset: t.StringC;
        }>]>, t.TypeC<{
            documentType: t.UnionC<[t.LiteralC<import("../../../common/document_type").ApmDocumentType.ServiceTransactionMetric>, t.LiteralC<import("../../../common/document_type").ApmDocumentType.TransactionMetric>, t.LiteralC<import("../../../common/document_type").ApmDocumentType.TransactionEvent>]>;
            rollupInterval: t.UnionC<[t.LiteralC<import("../../../common/rollup").RollupInterval.OneMinute>, t.LiteralC<import("../../../common/rollup").RollupInterval.TenMinutes>, t.LiteralC<import("../../../common/rollup").RollupInterval.SixtyMinutes>, t.LiteralC<import("../../../common/rollup").RollupInterval.None>]>;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, TransactionLatencyResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/transactions/groups/detailed_statistics": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/services/{serviceName}/transactions/groups/detailed_statistics", t.TypeC<{
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
        }>, t.IntersectionC<[t.PartialC<{
            offset: t.StringC;
        }>, t.TypeC<{
            documentType: t.UnionC<[t.LiteralC<import("../../../common/document_type").ApmDocumentType.TransactionMetric>, t.LiteralC<import("../../../common/document_type").ApmDocumentType.TransactionEvent>]>;
            rollupInterval: t.UnionC<[t.LiteralC<import("../../../common/rollup").RollupInterval.OneMinute>, t.LiteralC<import("../../../common/rollup").RollupInterval.TenMinutes>, t.LiteralC<import("../../../common/rollup").RollupInterval.SixtyMinutes>, t.LiteralC<import("../../../common/rollup").RollupInterval.None>]>;
        }>, t.TypeC<{
            bucketSizeInSeconds: t.Type<number, number, unknown>;
            useDurationSummary: t.Type<boolean, boolean, unknown>;
        }>]>, t.TypeC<{
            transactionNames: t.Type<string[], string, unknown>;
            transactionType: t.StringC;
            latencyAggregationType: t.UnionC<[t.LiteralC<LatencyAggregationType.avg>, t.LiteralC<LatencyAggregationType.p95>, t.LiteralC<LatencyAggregationType.p99>]>;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, ServiceTransactionGroupDetailedStatisticsResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/transactions/groups/main_statistics": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/services/{serviceName}/transactions/groups/main_statistics", t.TypeC<{
        path: t.TypeC<{
            serviceName: t.StringC;
        }>;
        query: t.IntersectionC<[t.PartialC<{
            searchQuery: t.StringC;
        }>, t.TypeC<{
            environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>, t.TypeC<{
            kuery: t.StringC;
            useDurationSummary: t.Type<boolean, boolean, unknown>;
            transactionType: t.StringC;
            latencyAggregationType: t.UnionC<[t.LiteralC<LatencyAggregationType.avg>, t.LiteralC<LatencyAggregationType.p95>, t.LiteralC<LatencyAggregationType.p99>]>;
        }>, t.TypeC<{
            documentType: t.UnionC<[t.LiteralC<import("../../../common/document_type").ApmDocumentType.TransactionMetric>, t.LiteralC<import("../../../common/document_type").ApmDocumentType.TransactionEvent>]>;
            rollupInterval: t.UnionC<[t.LiteralC<import("../../../common/rollup").RollupInterval.OneMinute>, t.LiteralC<import("../../../common/rollup").RollupInterval.TenMinutes>, t.LiteralC<import("../../../common/rollup").RollupInterval.SixtyMinutes>, t.LiteralC<import("../../../common/rollup").RollupInterval.None>]>;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, MergedServiceTransactionGroupsResponse, import("../typings").APMRouteCreateOptions>;
};
