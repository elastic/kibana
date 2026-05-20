import type { BaseFlameGraph, TopNFunctions } from '@kbn/profiling-utils';
import * as t from 'io-ts';
export declare const profilingHostsRouteRepository: {
    "GET /internal/apm/services/{serviceName}/profiling/hosts/functions": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/services/{serviceName}/profiling/hosts/functions", t.TypeC<{
        path: t.TypeC<{
            serviceName: t.StringC;
        }>;
        query: t.IntersectionC<[t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>, t.TypeC<{
            environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, t.TypeC<{
            documentType: t.UnionC<[t.LiteralC<import("../../../../common/document_type").ApmDocumentType.ServiceTransactionMetric>, t.LiteralC<import("../../../../common/document_type").ApmDocumentType.TransactionMetric>, t.LiteralC<import("../../../../common/document_type").ApmDocumentType.TransactionEvent>]>;
            rollupInterval: t.UnionC<[t.LiteralC<import("../../../../common/rollup").RollupInterval.OneMinute>, t.LiteralC<import("../../../../common/rollup").RollupInterval.TenMinutes>, t.LiteralC<import("../../../../common/rollup").RollupInterval.SixtyMinutes>, t.LiteralC<import("../../../../common/rollup").RollupInterval.None>]>;
        }>, t.TypeC<{
            startIndex: t.Type<number, number, unknown>;
            endIndex: t.Type<number, number, unknown>;
        }>, t.TypeC<{
            kuery: t.StringC;
        }>]>;
    }>, import("../../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
        functions: TopNFunctions;
        hostNames: string[];
        containerIds: string[];
    } | undefined, import("../../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/profiling/hosts/flamegraph": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/services/{serviceName}/profiling/hosts/flamegraph", t.TypeC<{
        path: t.TypeC<{
            serviceName: t.StringC;
        }>;
        query: t.IntersectionC<[t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>, t.TypeC<{
            environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, t.TypeC<{
            documentType: t.UnionC<[t.LiteralC<import("../../../../common/document_type").ApmDocumentType.ServiceTransactionMetric>, t.LiteralC<import("../../../../common/document_type").ApmDocumentType.TransactionMetric>, t.LiteralC<import("../../../../common/document_type").ApmDocumentType.TransactionEvent>]>;
            rollupInterval: t.UnionC<[t.LiteralC<import("../../../../common/rollup").RollupInterval.OneMinute>, t.LiteralC<import("../../../../common/rollup").RollupInterval.TenMinutes>, t.LiteralC<import("../../../../common/rollup").RollupInterval.SixtyMinutes>, t.LiteralC<import("../../../../common/rollup").RollupInterval.None>]>;
        }>, t.TypeC<{
            kuery: t.StringC;
        }>]>;
    }>, import("../../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
        flamegraph: BaseFlameGraph;
        hostNames: string[];
        containerIds: string[];
    } | undefined, import("../../typings").APMRouteCreateOptions>;
};
