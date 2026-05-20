import type { Annotation } from '@kbn/observability-plugin/common/annotations';
import type * as t from 'io-ts';
import type { ServiceAnomalyTimeseries } from '../../../common/anomaly_detection/service_anomaly_timeseries';
import type { ServiceAnnotationResponse } from './annotations';
import type { ServicesItemsResponse } from './get_services/get_services_items';
import type { ServiceAnomalyScoreResponse } from './get_services/get_service_anomaly_score_for_service';
import type { ServiceSlosResponse } from './get_service_slos';
import type { ServiceTransactionDetailedStatPeriodsResponse } from './get_services_detailed_statistics/get_service_transaction_detailed_statistics';
import type { ServiceAgentResponse } from './get_service_agent';
import type { ServiceMixedIngestionResponse } from './get_service_mixed_ingestion';
import type { ServiceDependenciesResponse } from './get_service_dependencies';
import type { ServiceDependenciesBreakdownResponse } from './get_service_dependencies_breakdown';
import type { ServiceInstancesDetailedStatisticsResponse } from './get_service_instances/detailed_statistics';
import type { ServiceInstanceMainStatisticsResponse } from './get_service_instances/main_statistics';
import type { ServiceInstanceMetadataDetailsResponse } from './get_service_instance_metadata_details';
import type { ServiceMetadataDetails } from './get_service_metadata_details';
import type { ServiceMetadataIcons } from './get_service_metadata_icons';
import type { ServiceNodeMetadataResponse } from './get_service_node_metadata';
import type { ServiceTransactionTypesResponse } from './get_service_transaction_types';
import type { ServiceThroughputResponse } from './get_throughput';
export declare const serviceInstancesMetadataDetails: Record<"GET /internal/apm/services/{serviceName}/service_overview_instances/details/{serviceNodeName}", import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/services/{serviceName}/service_overview_instances/details/{serviceNodeName}", t.TypeC<{
    path: t.TypeC<{
        serviceName: t.StringC;
        serviceNodeName: t.StringC;
    }>;
    query: t.TypeC<{
        start: t.Type<number, string, unknown>;
        end: t.Type<number, string, unknown>;
    }>;
}>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, ServiceInstanceMetadataDetailsResponse | (ServiceInstanceMetadataDetailsResponse & {
    kubernetes: import("@kbn/apm-types").Kubernetes;
}), import("../typings").APMRouteCreateOptions>>;
export declare const serviceDependenciesRoute: Record<"GET /internal/apm/services/{serviceName}/dependencies", import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/services/{serviceName}/dependencies", t.TypeC<{
    path: t.TypeC<{
        serviceName: t.StringC;
    }>;
    query: t.IntersectionC<[t.TypeC<{
        numBuckets: t.Type<number, number, unknown>;
    }>, t.TypeC<{
        environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
    }>, t.TypeC<{
        start: t.Type<number, string, unknown>;
        end: t.Type<number, string, unknown>;
    }>, t.PartialC<{
        offset: t.StringC;
    }>]>;
}>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
    serviceDependencies: ServiceDependenciesResponse;
}, import("../typings").APMRouteCreateOptions>>;
export declare const serviceDependenciesBreakdownRoute: Record<"GET /internal/apm/services/{serviceName}/dependencies/breakdown", import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/services/{serviceName}/dependencies/breakdown", t.TypeC<{
    path: t.TypeC<{
        serviceName: t.StringC;
    }>;
    query: t.IntersectionC<[t.TypeC<{
        environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
    }>, t.TypeC<{
        start: t.Type<number, string, unknown>;
        end: t.Type<number, string, unknown>;
    }>, t.TypeC<{
        kuery: t.StringC;
    }>]>;
}>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
    breakdown: ServiceDependenciesBreakdownResponse;
}, import("../typings").APMRouteCreateOptions>>;
export declare const serviceRouteRepository: {
    "GET /internal/apm/services/{serviceName}/slos": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/services/{serviceName}/slos", t.TypeC<{
        path: t.TypeC<{
            serviceName: t.StringC;
        }>;
        query: t.IntersectionC<[t.TypeC<{
            environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, t.TypeC<{
            page: t.Type<number, number, unknown>;
            perPage: t.Type<number, number, unknown>;
        }>, t.PartialC<{
            statusFilters: t.Type<string[], string, unknown>;
            kqlQuery: t.StringC;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, ServiceSlosResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/anomaly_score": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/services/{serviceName}/anomaly_score", t.TypeC<{
        path: t.TypeC<{
            serviceName: t.StringC;
        }>;
        query: t.IntersectionC<[t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>, t.TypeC<{
            environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, ServiceAnomalyScoreResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/alerts_count": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/services/{serviceName}/alerts_count", t.TypeC<{
        path: t.TypeC<{
            serviceName: t.StringC;
        }>;
        query: t.IntersectionC<[t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>, t.TypeC<{
            environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
        serviceName: string;
        alertsCount: number;
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/anomaly_charts": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/services/{serviceName}/anomaly_charts", t.TypeC<{
        path: t.TypeC<{
            serviceName: t.StringC;
        }>;
        query: t.IntersectionC<[t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>, t.TypeC<{
            environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, t.TypeC<{
            transactionType: t.StringC;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
        allAnomalyTimeseries: ServiceAnomalyTimeseries[];
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/dependencies/breakdown": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/services/{serviceName}/dependencies/breakdown", t.TypeC<{
        path: t.TypeC<{
            serviceName: t.StringC;
        }>;
        query: t.IntersectionC<[t.TypeC<{
            environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>, t.TypeC<{
            kuery: t.StringC;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
        breakdown: ServiceDependenciesBreakdownResponse;
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/dependencies": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/services/{serviceName}/dependencies", t.TypeC<{
        path: t.TypeC<{
            serviceName: t.StringC;
        }>;
        query: t.IntersectionC<[t.TypeC<{
            numBuckets: t.Type<number, number, unknown>;
        }>, t.TypeC<{
            environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>, t.PartialC<{
            offset: t.StringC;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
        serviceDependencies: ServiceDependenciesResponse;
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/service_overview_instances/detailed_statistics": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/services/{serviceName}/service_overview_instances/detailed_statistics", t.TypeC<{
        path: t.TypeC<{
            serviceName: t.StringC;
        }>;
        query: t.IntersectionC<[t.TypeC<{
            latencyAggregationType: t.UnionC<[t.LiteralC<import("@kbn/apm-types/src/latency_aggregation_types").LatencyAggregationType.avg>, t.LiteralC<import("@kbn/apm-types/src/latency_aggregation_types").LatencyAggregationType.p95>, t.LiteralC<import("@kbn/apm-types/src/latency_aggregation_types").LatencyAggregationType.p99>]>;
            transactionType: t.StringC;
            serviceNodeIds: t.Type<string[], string, unknown>;
            numBuckets: t.Type<number, number, unknown>;
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
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, ServiceInstancesDetailedStatisticsResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/service_overview_instances/main_statistics": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/services/{serviceName}/service_overview_instances/main_statistics", t.TypeC<{
        path: t.TypeC<{
            serviceName: t.StringC;
        }>;
        query: t.IntersectionC<[t.TypeC<{
            latencyAggregationType: t.UnionC<[t.LiteralC<import("@kbn/apm-types/src/latency_aggregation_types").LatencyAggregationType.avg>, t.LiteralC<import("@kbn/apm-types/src/latency_aggregation_types").LatencyAggregationType.p95>, t.LiteralC<import("@kbn/apm-types/src/latency_aggregation_types").LatencyAggregationType.p99>]>;
            transactionType: t.StringC;
            sortField: t.KeyofC<{
                serviceNodeName: null;
                latency: null;
                throughput: null;
                errorRate: null;
                cpuUsage: null;
                memoryUsage: null;
            }>;
            sortDirection: t.UnionC<[t.LiteralC<"asc">, t.LiteralC<"desc">]>;
        }>, t.PartialC<{
            offset: t.StringC;
        }>, t.TypeC<{
            environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, t.TypeC<{
            kuery: t.StringC;
        }>, t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
        currentPeriod: ServiceInstanceMainStatisticsResponse;
        previousPeriod: ServiceInstanceMainStatisticsResponse;
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/throughput": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/services/{serviceName}/throughput", t.TypeC<{
        path: t.TypeC<{
            serviceName: t.StringC;
        }>;
        query: t.IntersectionC<[t.TypeC<{
            bucketSizeInSeconds: t.Type<number, number, unknown>;
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
        }>, t.TypeC<{
            documentType: t.UnionC<[t.LiteralC<import("../../../common/document_type").ApmDocumentType.ServiceTransactionMetric>, t.LiteralC<import("../../../common/document_type").ApmDocumentType.TransactionMetric>, t.LiteralC<import("../../../common/document_type").ApmDocumentType.TransactionEvent>]>;
            rollupInterval: t.UnionC<[t.LiteralC<import("../../../common/rollup").RollupInterval.OneMinute>, t.LiteralC<import("../../../common/rollup").RollupInterval.TenMinutes>, t.LiteralC<import("../../../common/rollup").RollupInterval.SixtyMinutes>, t.LiteralC<import("../../../common/rollup").RollupInterval.None>]>;
        }>]>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
        currentPeriod: ServiceThroughputResponse;
        previousPeriod: ServiceThroughputResponse;
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/service_overview_instances/details/{serviceNodeName}": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/services/{serviceName}/service_overview_instances/details/{serviceNodeName}", t.TypeC<{
        path: t.TypeC<{
            serviceName: t.StringC;
            serviceNodeName: t.StringC;
        }>;
        query: t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, ServiceInstanceMetadataDetailsResponse | (ServiceInstanceMetadataDetailsResponse & {
        kubernetes: import("@kbn/apm-types").Kubernetes;
    }), import("../typings").APMRouteCreateOptions>;
    "POST /api/apm/services/{serviceName}/annotation 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"POST /api/apm/services/{serviceName}/annotation 2023-10-31", t.TypeC<{
        path: t.TypeC<{
            serviceName: t.StringC;
        }>;
        body: t.IntersectionC<[t.TypeC<{
            '@timestamp': t.Type<number, string, unknown>;
            service: t.IntersectionC<[t.TypeC<{
                version: t.StringC;
            }>, t.PartialC<{
                environment: t.StringC;
            }>]>;
        }>, t.PartialC<{
            message: t.StringC;
            tags: t.ArrayC<t.StringC>;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
        _id: string;
        _index: string;
        _source: Annotation;
    }, import("../typings").APMRouteCreateOptions>;
    "GET /api/apm/services/{serviceName}/annotation/search 2023-10-31": import("@kbn/server-route-repository-utils").ServerRoute<"GET /api/apm/services/{serviceName}/annotation/search 2023-10-31", t.TypeC<{
        path: t.TypeC<{
            serviceName: t.StringC;
        }>;
        query: t.IntersectionC<[t.TypeC<{
            environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, ServiceAnnotationResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/node/{serviceNodeName}/metadata": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/services/{serviceName}/node/{serviceNodeName}/metadata", t.TypeC<{
        path: t.TypeC<{
            serviceName: t.StringC;
            serviceNodeName: t.StringC;
        }>;
        query: t.IntersectionC<[t.TypeC<{
            kuery: t.StringC;
        }>, t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>, t.TypeC<{
            environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, t.TypeC<{
            documentType: t.UnionC<[t.LiteralC<import("../../../common/document_type").ApmDocumentType.ServiceTransactionMetric>, t.LiteralC<import("../../../common/document_type").ApmDocumentType.TransactionMetric>, t.LiteralC<import("../../../common/document_type").ApmDocumentType.TransactionEvent>]>;
            rollupInterval: t.UnionC<[t.LiteralC<import("../../../common/rollup").RollupInterval.OneMinute>, t.LiteralC<import("../../../common/rollup").RollupInterval.TenMinutes>, t.LiteralC<import("../../../common/rollup").RollupInterval.SixtyMinutes>, t.LiteralC<import("../../../common/rollup").RollupInterval.None>]>;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, ServiceNodeMetadataResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/transaction_types": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/services/{serviceName}/transaction_types", t.TypeC<{
        path: t.TypeC<{
            serviceName: t.StringC;
        }>;
        query: t.IntersectionC<[t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>, t.TypeC<{
            documentType: t.UnionC<[t.LiteralC<import("../../../common/document_type").ApmDocumentType.ServiceTransactionMetric>, t.LiteralC<import("../../../common/document_type").ApmDocumentType.TransactionMetric>, t.LiteralC<import("../../../common/document_type").ApmDocumentType.TransactionEvent>]>;
            rollupInterval: t.UnionC<[t.LiteralC<import("../../../common/rollup").RollupInterval.OneMinute>, t.LiteralC<import("../../../common/rollup").RollupInterval.TenMinutes>, t.LiteralC<import("../../../common/rollup").RollupInterval.SixtyMinutes>, t.LiteralC<import("../../../common/rollup").RollupInterval.None>]>;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, ServiceTransactionTypesResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/metrics/mixed_ingestion": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/services/{serviceName}/metrics/mixed_ingestion", t.TypeC<{
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
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, ServiceMixedIngestionResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/agent": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/services/{serviceName}/agent", t.TypeC<{
        path: t.TypeC<{
            serviceName: t.StringC;
        }>;
        query: t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, ServiceAgentResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/metadata/icons": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/services/{serviceName}/metadata/icons", t.TypeC<{
        path: t.TypeC<{
            serviceName: t.StringC;
        }>;
        query: t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, ServiceMetadataIcons, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/metadata/details": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/services/{serviceName}/metadata/details", t.TypeC<{
        path: t.TypeC<{
            serviceName: t.StringC;
        }>;
        query: t.IntersectionC<[t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>, t.TypeC<{
            environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, ServiceMetadataDetails, import("../typings").APMRouteCreateOptions>;
    "POST /internal/apm/services/detailed_statistics": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/apm/services/detailed_statistics", t.TypeC<{
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
            probability: t.Type<number, number, unknown>;
        }>, t.TypeC<{
            documentType: t.UnionC<[t.LiteralC<import("../../../common/document_type").ApmDocumentType.ServiceTransactionMetric>, t.LiteralC<import("../../../common/document_type").ApmDocumentType.TransactionMetric>, t.LiteralC<import("../../../common/document_type").ApmDocumentType.TransactionEvent>]>;
            rollupInterval: t.UnionC<[t.LiteralC<import("../../../common/rollup").RollupInterval.OneMinute>, t.LiteralC<import("../../../common/rollup").RollupInterval.TenMinutes>, t.LiteralC<import("../../../common/rollup").RollupInterval.SixtyMinutes>, t.LiteralC<import("../../../common/rollup").RollupInterval.None>]>;
        }>]>, t.TypeC<{
            bucketSizeInSeconds: t.Type<number, number, unknown>;
        }>]>;
        body: t.TypeC<{
            serviceNames: t.Type<string[], string, unknown>;
        }>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, ServiceTransactionDetailedStatPeriodsResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/services", t.TypeC<{
        query: t.IntersectionC<[t.PartialC<{
            searchQuery: t.StringC;
            serviceGroup: t.StringC;
        }>, t.IntersectionC<[t.TypeC<{
            probability: t.Type<number, number, unknown>;
        }>, t.IntersectionC<[t.TypeC<{
            documentType: t.UnionC<[t.LiteralC<import("../../../common/document_type").ApmDocumentType.ServiceTransactionMetric>, t.LiteralC<import("../../../common/document_type").ApmDocumentType.TransactionMetric>, t.LiteralC<import("../../../common/document_type").ApmDocumentType.TransactionEvent>]>;
            rollupInterval: t.UnionC<[t.LiteralC<import("../../../common/rollup").RollupInterval.OneMinute>, t.LiteralC<import("../../../common/rollup").RollupInterval.TenMinutes>, t.LiteralC<import("../../../common/rollup").RollupInterval.SixtyMinutes>, t.LiteralC<import("../../../common/rollup").RollupInterval.None>]>;
        }>, t.TypeC<{
            useDurationSummary: t.Type<boolean, boolean, unknown>;
        }>]>, t.TypeC<{
            environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, t.TypeC<{
            kuery: t.StringC;
        }>, t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>]>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, ServicesItemsResponse, import("../typings").APMRouteCreateOptions>;
};
