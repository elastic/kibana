import * as t from 'io-ts';
import type { Error } from '@kbn/apm-types';
import type { ErrorsByTraceId, UnifiedSpanDocument, TraceRootSpan, FocusedTraceItems, TransactionDetailRedirectInfo } from '@kbn/apm-types';
import type { TraceItem } from '../../../common/waterfall/unified_trace_item';
import type { Span } from '../../../typings/es_schemas/ui/span';
import type { Transaction } from '../../../typings/es_schemas/ui/transaction';
import type { TopTracesPrimaryStatsResponse } from './get_top_traces_primary_stats';
export declare const traceRouteRepository: {
    "GET /internal/apm/unified_traces/{traceId}/spans/{spanId}": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/unified_traces/{traceId}/spans/{spanId}", t.TypeC<{
        path: t.TypeC<{
            traceId: t.StringC;
            spanId: t.StringC;
        }>;
        query: t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, UnifiedSpanDocument | undefined, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/unified_traces/{traceId}/errors": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/unified_traces/{traceId}/errors", t.TypeC<{
        path: t.TypeC<{
            traceId: t.StringC;
        }>;
        query: t.IntersectionC<[t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>, t.PartialC<{
            docId: t.StringC;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, ErrorsByTraceId, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/unified_traces/{traceId}/summary": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/unified_traces/{traceId}/summary", t.TypeC<{
        path: t.TypeC<{
            traceId: t.StringC;
        }>;
        query: t.IntersectionC<[t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>, t.PartialC<{
            maxTraceItems: t.Type<number, number, unknown>;
            docId: t.StringC;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
        traceItems?: FocusedTraceItems;
        summary: {
            services: number;
            traceEvents: number;
            errors: number;
        };
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/transactions": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/transactions", t.TypeC<{
        query: t.IntersectionC<[t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>, t.TypeC<{
            transactionName: t.StringC;
            serviceName: t.StringC;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
        transaction?: TransactionDetailRedirectInfo;
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/traces/{traceId}/spans/{spanId}": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/traces/{traceId}/spans/{spanId}", t.TypeC<{
        path: t.TypeC<{
            traceId: t.StringC;
            spanId: t.StringC;
        }>;
        query: t.IntersectionC<[t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>, t.UnionC<[t.PartialC<{
            parentTransactionId: t.StringC;
        }>, t.UndefinedC]>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
        span?: Span;
        parentTransaction?: Transaction;
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/traces/{traceId}/transactions/{transactionId}": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/traces/{traceId}/transactions/{transactionId}", t.TypeC<{
        path: t.TypeC<{
            traceId: t.StringC;
            transactionId: t.StringC;
        }>;
        query: t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, Transaction | undefined, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/transactions/{transactionId}": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/transactions/{transactionId}", t.TypeC<{
        path: t.TypeC<{
            transactionId: t.StringC;
        }>;
        query: t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
        transaction?: Transaction;
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/unified_traces/{traceId}/root_span": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/unified_traces/{traceId}/root_span", t.TypeC<{
        path: t.TypeC<{
            traceId: t.StringC;
        }>;
        query: t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, TraceRootSpan | undefined, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/traces/{traceId}/root_transaction": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/traces/{traceId}/root_transaction", t.TypeC<{
        path: t.TypeC<{
            traceId: t.StringC;
        }>;
        query: t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
        transaction?: TransactionDetailRedirectInfo;
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/traces": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/traces", t.TypeC<{
        query: t.IntersectionC<[t.TypeC<{
            environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, t.TypeC<{
            kuery: t.StringC;
        }>, t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>, t.TypeC<{
            probability: t.Type<number, number, unknown>;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, TopTracesPrimaryStatsResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/unified_traces/{traceId}": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/unified_traces/{traceId}", t.TypeC<{
        path: t.TypeC<{
            traceId: t.StringC;
        }>;
        query: t.IntersectionC<[t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>, t.PartialC<{
            serviceName: t.StringC;
            entryTransactionId: t.StringC;
            ecsOnly: t.Type<boolean, boolean, unknown>;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
        traceItems: TraceItem[];
        errors: Error[];
        agentMarks: Record<string, number>;
        entryTransaction?: Transaction;
        traceDocsTotal: number;
        maxTraceItems: number;
    }, import("../typings").APMRouteCreateOptions>;
};
