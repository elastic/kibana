import * as t from 'io-ts';
import type { DurationFieldCandidatesResponse } from './queries/fetch_duration_field_candidates';
import type { FieldValuePairsResponse } from './queries/fetch_field_value_pairs';
import type { SignificantCorrelationsResponse } from './queries/fetch_significant_correlations';
import type { PValuesResponse } from './queries/fetch_p_values';
import type { TopValuesStats } from '../../../common/correlations/field_stats_types';
import type { CorrelationsResponse } from '../../../common/correlations/types';
export declare const correlationsRouteRepository: {
    "POST /internal/apm/correlations": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/apm/correlations", t.TypeC<{
        body: t.IntersectionC<[t.TypeC<{
            entityType: t.UnionC<[t.LiteralC<"transaction">, t.LiteralC<"exit_span">]>;
            metric: t.UnionC<[t.LiteralC<"latency">, t.LiteralC<"failure_rate">]>;
        }>, t.PartialC<{
            fieldCandidates: t.ArrayC<t.StringC>;
            durationMin: t.Type<number, number, unknown>;
            durationMax: t.Type<number, number, unknown>;
            percentileThreshold: t.Type<number, number, unknown>;
            includeHistogram: t.Type<boolean, boolean, unknown>;
            kuery: t.StringC;
        }>, t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, CorrelationsResponse, import("../typings").APMRouteCreateOptions>;
    "POST /internal/apm/correlations/p_values/transactions": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/apm/correlations/p_values/transactions", t.TypeC<{
        body: t.IntersectionC<[t.PartialC<{
            serviceName: t.StringC;
            transactionName: t.StringC;
            transactionType: t.StringC;
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
            fieldCandidates: t.ArrayC<t.StringC>;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, PValuesResponse, import("../typings").APMRouteCreateOptions>;
    "POST /internal/apm/correlations/significant_correlations/transactions": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/apm/correlations/significant_correlations/transactions", t.TypeC<{
        body: t.IntersectionC<[t.PartialC<{
            serviceName: t.StringC;
            transactionName: t.StringC;
            transactionType: t.StringC;
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
            fieldValuePairs: t.ArrayC<t.TypeC<{
                fieldName: t.StringC;
                fieldValue: t.UnionC<[t.StringC, t.Type<number, number, unknown>]>;
            }>>;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, SignificantCorrelationsResponse, import("../typings").APMRouteCreateOptions>;
    "POST /internal/apm/correlations/field_value_pairs/transactions": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/apm/correlations/field_value_pairs/transactions", t.TypeC<{
        body: t.IntersectionC<[t.PartialC<{
            serviceName: t.StringC;
            transactionName: t.StringC;
            transactionType: t.StringC;
        }>, t.TypeC<{
            environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, t.TypeC<{
            kuery: t.StringC;
        }>, t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>, t.TypeC<{
            fieldCandidates: t.ArrayC<t.StringC>;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, FieldValuePairsResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/correlations/field_value_stats/transactions": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/correlations/field_value_stats/transactions", t.TypeC<{
        query: t.IntersectionC<[t.PartialC<{
            serviceName: t.StringC;
            transactionName: t.StringC;
            transactionType: t.StringC;
            samplerShardSize: t.StringC;
        }>, t.TypeC<{
            environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, t.TypeC<{
            kuery: t.StringC;
        }>, t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>, t.TypeC<{
            fieldName: t.StringC;
            fieldValue: t.UnionC<[t.StringC, t.NumberC]>;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, TopValuesStats, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/correlations/field_candidates/transactions": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/correlations/field_candidates/transactions", t.TypeC<{
        query: t.IntersectionC<[t.PartialC<{
            serviceName: t.StringC;
            transactionName: t.StringC;
            transactionType: t.StringC;
        }>, t.TypeC<{
            environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, t.TypeC<{
            kuery: t.StringC;
        }>, t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, DurationFieldCandidatesResponse, import("../typings").APMRouteCreateOptions>;
};
