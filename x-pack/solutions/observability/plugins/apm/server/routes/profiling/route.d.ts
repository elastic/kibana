import type { BaseFlameGraph, TopNFunctions } from '@kbn/profiling-utils';
import * as t from 'io-ts';
export declare const profilingRouteRepository: {
    "GET /internal/apm/services/{serviceName}/profiling/functions": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/services/{serviceName}/profiling/functions", t.TypeC<{
        path: t.TypeC<{
            serviceName: t.StringC;
        }>;
        query: t.IntersectionC<[t.TypeC<{
            environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>, t.PartialC<{
            transactionName: t.StringC;
        }>, t.TypeC<{
            startIndex: t.Type<number, number, unknown>;
            endIndex: t.Type<number, number, unknown>;
            transactionType: t.StringC;
        }>, t.TypeC<{
            kuery: t.StringC;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, TopNFunctions | undefined, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/profiling/status": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/profiling/status", undefined, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
        initialized: boolean;
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/profiling/flamegraph": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/services/{serviceName}/profiling/flamegraph", t.TypeC<{
        path: t.TypeC<{
            serviceName: t.StringC;
        }>;
        query: t.IntersectionC<[t.TypeC<{
            kuery: t.StringC;
        }>, t.TypeC<{
            environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>, t.PartialC<{
            transactionName: t.StringC;
        }>, t.TypeC<{
            transactionType: t.StringC;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, BaseFlameGraph | undefined, import("../typings").APMRouteCreateOptions>;
};
