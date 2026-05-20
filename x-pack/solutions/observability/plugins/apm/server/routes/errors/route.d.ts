import * as t from 'io-ts';
import type { ErrorDistributionResponse } from './distribution/get_distribution';
import type { ErrorGroupMainStatisticsResponse } from './get_error_groups/get_error_group_main_statistics';
import type { ErrorGroupPeriodsResponse } from './get_error_groups/get_error_group_detailed_statistics';
import type { ErrorGroupSampleIdsResponse } from './get_error_groups/get_error_group_sample_ids';
import type { ErrorSampleDetailsResponse } from './get_error_groups/get_error_sample_details';
import type { TopErroneousTransactionsResponse } from './erroneous_transactions/get_top_erroneous_transactions';
export declare const errorsRouteRepository: {
    "GET /internal/apm/services/{serviceName}/errors/{groupId}/top_erroneous_transactions": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/services/{serviceName}/errors/{groupId}/top_erroneous_transactions", t.TypeC<{
        path: t.TypeC<{
            serviceName: t.StringC;
            groupId: t.StringC;
        }>;
        query: t.IntersectionC<[t.TypeC<{
            environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, t.TypeC<{
            kuery: t.StringC;
        }>, t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>, t.PartialC<{
            offset: t.StringC;
        }>, t.TypeC<{
            numBuckets: t.Type<number, number, unknown>;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, TopErroneousTransactionsResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/errors/distribution": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/services/{serviceName}/errors/distribution", t.TypeC<{
        path: t.TypeC<{
            serviceName: t.StringC;
        }>;
        query: t.IntersectionC<[t.PartialC<{
            groupId: t.StringC;
            transactionName: t.StringC;
            bucketSizeInSeconds: t.Type<number, number, unknown>;
        }>, t.TypeC<{
            environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, t.TypeC<{
            kuery: t.StringC;
        }>, t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>, t.PartialC<{
            offset: t.StringC;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, ErrorDistributionResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/errors/{groupId}/error/{errorId}": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/services/{serviceName}/errors/{groupId}/error/{errorId}", t.TypeC<{
        path: t.TypeC<{
            serviceName: t.StringC;
            groupId: t.StringC;
            errorId: t.StringC;
        }>;
        query: t.IntersectionC<[t.TypeC<{
            environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, t.TypeC<{
            kuery: t.StringC;
        }>, t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, ErrorSampleDetailsResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/errors/{groupId}/samples": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/services/{serviceName}/errors/{groupId}/samples", t.TypeC<{
        path: t.TypeC<{
            serviceName: t.StringC;
            groupId: t.StringC;
        }>;
        query: t.IntersectionC<[t.TypeC<{
            environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, t.TypeC<{
            kuery: t.StringC;
        }>, t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, ErrorGroupSampleIdsResponse, import("../typings").APMRouteCreateOptions>;
    "POST /internal/apm/services/{serviceName}/errors/groups/detailed_statistics": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/apm/services/{serviceName}/errors/groups/detailed_statistics", t.TypeC<{
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
            offset: t.StringC;
        }>, t.TypeC<{
            numBuckets: t.Type<number, number, unknown>;
        }>]>;
        body: t.TypeC<{
            groupIds: t.Type<string[], string, unknown>;
        }>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, ErrorGroupPeriodsResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/errors/groups/main_statistics_by_transaction_name": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/services/{serviceName}/errors/groups/main_statistics_by_transaction_name", t.TypeC<{
        path: t.TypeC<{
            serviceName: t.StringC;
        }>;
        query: t.IntersectionC<[t.TypeC<{
            transactionType: t.StringC;
            transactionName: t.StringC;
            maxNumberOfErrorGroups: t.Type<number, number, unknown>;
        }>, t.TypeC<{
            environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, t.TypeC<{
            kuery: t.StringC;
        }>, t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, ErrorGroupMainStatisticsResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/errors/groups/main_statistics": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/services/{serviceName}/errors/groups/main_statistics", t.TypeC<{
        path: t.TypeC<{
            serviceName: t.StringC;
        }>;
        query: t.IntersectionC<[t.PartialC<{
            sortField: t.StringC;
            sortDirection: t.UnionC<[t.LiteralC<"asc">, t.LiteralC<"desc">]>;
            searchQuery: t.StringC;
        }>, t.TypeC<{
            environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, t.TypeC<{
            kuery: t.StringC;
        }>, t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, ErrorGroupMainStatisticsResponse, import("../typings").APMRouteCreateOptions>;
};
