import type { EndpointOf, ServerRouteRepository } from '@kbn/server-route-repository';
declare function getTypedGlobalApmServerRouteRepository(): {
    "GET /internal/apm/services/{serviceName}/dashboards": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/services/{serviceName}/dashboards", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            serviceName: import("io-ts").StringC;
        }>;
        query: import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, {
        serviceDashboards: import("@kbn/apm-types").SavedApmCustomDashboard[];
    }, import("../typings").APMRouteCreateOptions>;
    "DELETE /internal/apm/custom-dashboard": import("@kbn/server-route-repository").ServerRoute<"DELETE /internal/apm/custom-dashboard", import("io-ts").TypeC<{
        query: import("io-ts").TypeC<{
            customDashboardId: import("io-ts").StringC;
        }>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, void, import("../typings").APMRouteCreateOptions>;
    "POST /internal/apm/custom-dashboard": import("@kbn/server-route-repository").ServerRoute<"POST /internal/apm/custom-dashboard", import("io-ts").TypeC<{
        query: import("io-ts").UnionC<[import("io-ts").PartialC<{
            customDashboardId: import("io-ts").StringC;
        }>, import("io-ts").UndefinedC]>;
        body: import("io-ts").TypeC<{
            dashboardSavedObjectId: import("io-ts").StringC;
            kuery: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").UndefinedC]>;
            serviceNameFilterEnabled: import("io-ts").BooleanC;
            serviceEnvironmentFilterEnabled: import("io-ts").BooleanC;
        }>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("@kbn/apm-types").SavedApmCustomDashboard, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/profiling/hosts/functions": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/services/{serviceName}/profiling/hosts/functions", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            serviceName: import("io-ts").StringC;
        }>;
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            documentType: import("io-ts").UnionC<[import("io-ts").LiteralC<import("../../../common/document_type").ApmDocumentType.ServiceTransactionMetric>, import("io-ts").LiteralC<import("../../../common/document_type").ApmDocumentType.TransactionMetric>, import("io-ts").LiteralC<import("../../../common/document_type").ApmDocumentType.TransactionEvent>]>;
            rollupInterval: import("io-ts").UnionC<[import("io-ts").LiteralC<import("../../../common/rollup").RollupInterval.OneMinute>, import("io-ts").LiteralC<import("../../../common/rollup").RollupInterval.TenMinutes>, import("io-ts").LiteralC<import("../../../common/rollup").RollupInterval.SixtyMinutes>, import("io-ts").LiteralC<import("../../../common/rollup").RollupInterval.None>]>;
        }>, import("io-ts").TypeC<{
            startIndex: import("io-ts").Type<number, number, unknown>;
            endIndex: import("io-ts").Type<number, number, unknown>;
        }>, import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, {
        functions: import("@kbn/profiling-utils").TopNFunctions;
        hostNames: string[];
        containerIds: string[];
    } | undefined, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/profiling/hosts/flamegraph": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/services/{serviceName}/profiling/hosts/flamegraph", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            serviceName: import("io-ts").StringC;
        }>;
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            documentType: import("io-ts").UnionC<[import("io-ts").LiteralC<import("../../../common/document_type").ApmDocumentType.ServiceTransactionMetric>, import("io-ts").LiteralC<import("../../../common/document_type").ApmDocumentType.TransactionMetric>, import("io-ts").LiteralC<import("../../../common/document_type").ApmDocumentType.TransactionEvent>]>;
            rollupInterval: import("io-ts").UnionC<[import("io-ts").LiteralC<import("../../../common/rollup").RollupInterval.OneMinute>, import("io-ts").LiteralC<import("../../../common/rollup").RollupInterval.TenMinutes>, import("io-ts").LiteralC<import("../../../common/rollup").RollupInterval.SixtyMinutes>, import("io-ts").LiteralC<import("../../../common/rollup").RollupInterval.None>]>;
        }>, import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, {
        flamegraph: import("@kbn/profiling-utils").BaseFlameGraph;
        hostNames: string[];
        containerIds: string[];
    } | undefined, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/profiling/functions": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/services/{serviceName}/profiling/functions", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            serviceName: import("io-ts").StringC;
        }>;
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").PartialC<{
            transactionName: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            startIndex: import("io-ts").Type<number, number, unknown>;
            endIndex: import("io-ts").Type<number, number, unknown>;
            transactionType: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("@kbn/profiling-utils").TopNFunctions | undefined, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/profiling/status": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/profiling/status", undefined, import("./register_apm_server_routes").APMRouteHandlerResources, {
        initialized: boolean;
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/profiling/flamegraph": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/services/{serviceName}/profiling/flamegraph", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            serviceName: import("io-ts").StringC;
        }>;
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").PartialC<{
            transactionName: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            transactionType: import("io-ts").StringC;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("@kbn/profiling-utils").BaseFlameGraph | undefined, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/assistant/get_downstream_dependencies": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/assistant/get_downstream_dependencies", import("io-ts").TypeC<{
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            serviceName: import("io-ts").StringC;
            start: import("io-ts").StringC;
            end: import("io-ts").StringC;
        }>, import("io-ts").PartialC<{
            serviceEnvironment: import("io-ts").StringC;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, {
        content: import("../assistant_functions/get_apm_downstream_dependencies").APMDownstreamDependency[];
    }, import("../typings").APMRouteCreateOptions>;
    "POST /internal/apm/assistant/get_apm_timeseries": import("@kbn/server-route-repository").ServerRoute<"POST /internal/apm/assistant/get_apm_timeseries", import("io-ts").TypeC<{
        body: import("io-ts").TypeC<{
            stats: import("io-ts").ArrayC<import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                'service.name': import("io-ts").StringC;
                title: import("io-ts").StringC;
                timeseries: import("io-ts").UnionC<[import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                    name: import("io-ts").UnionC<[import("io-ts").LiteralC<import("../assistant_functions/get_apm_timeseries").ApmTimeseriesType.transactionThroughput>, import("io-ts").LiteralC<import("../assistant_functions/get_apm_timeseries").ApmTimeseriesType.transactionFailureRate>]>;
                }>, import("io-ts").PartialC<{
                    'transaction.type': import("io-ts").StringC;
                    'transaction.name': import("io-ts").StringC;
                }>]>, import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                    name: import("io-ts").UnionC<[import("io-ts").LiteralC<import("../assistant_functions/get_apm_timeseries").ApmTimeseriesType.exitSpanThroughput>, import("io-ts").LiteralC<import("../assistant_functions/get_apm_timeseries").ApmTimeseriesType.exitSpanFailureRate>, import("io-ts").LiteralC<import("../assistant_functions/get_apm_timeseries").ApmTimeseriesType.exitSpanLatency>]>;
                }>, import("io-ts").PartialC<{
                    'span.destination.service.resource': import("io-ts").StringC;
                }>]>, import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                    name: import("io-ts").LiteralC<import("../assistant_functions/get_apm_timeseries").ApmTimeseriesType.transactionLatency>;
                    function: import("io-ts").UnionC<[import("io-ts").LiteralC<import("@kbn/apm-types").LatencyAggregationType.avg>, import("io-ts").LiteralC<import("@kbn/apm-types").LatencyAggregationType.p95>, import("io-ts").LiteralC<import("@kbn/apm-types").LatencyAggregationType.p99>]>;
                }>, import("io-ts").PartialC<{
                    'transaction.type': import("io-ts").StringC;
                    'transaction.name': import("io-ts").StringC;
                }>]>, import("io-ts").TypeC<{
                    name: import("io-ts").LiteralC<import("../assistant_functions/get_apm_timeseries").ApmTimeseriesType.errorEventRate>;
                }>]>;
            }>, import("io-ts").PartialC<{
                filter: import("io-ts").StringC;
                offset: import("io-ts").StringC;
                'service.environment': import("io-ts").StringC;
            }>]>>;
            start: import("io-ts").StringC;
            end: import("io-ts").StringC;
        }>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, {
        content: Array<Omit<import("../assistant_functions/get_apm_timeseries").ApmTimeseries, "data">>;
        data: import("../assistant_functions/get_apm_timeseries").ApmTimeseries[];
    }, import("../typings").APMRouteCreateOptions>;
    "POST /internal/apm/diagnostics/service-map": import("@kbn/server-route-repository").ServerRoute<"POST /internal/apm/diagnostics/service-map", import("io-ts").TypeC<{
        body: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").TypeC<{
            sourceNode: import("io-ts").StringC;
            destinationNode: import("io-ts").StringC;
        }>, import("io-ts").PartialC<{
            traceId: import("io-ts").StringC;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("@kbn/apm-types").ServiceMapDiagnosticResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/diagnostics": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/diagnostics", import("io-ts").PartialC<{
        query: import("io-ts").PartialC<{
            kuery: import("io-ts").StringC;
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, {
        esResponses: {
            existingIndexTemplates: import("@elastic/elasticsearch/lib/api/types").IndicesGetIndexTemplateIndexTemplateItem[];
            fieldCaps?: import("@elastic/elasticsearch/lib/api/types").FieldCapsResponse;
            indices?: import("@elastic/elasticsearch/lib/api/types").IndicesGetResponse;
            ingestPipelines?: import("@elastic/elasticsearch/lib/api/types").IngestGetPipelineResponse;
        };
        diagnosticsPrivileges: {
            index: Record<string, import("@elastic/elasticsearch/lib/api/types").SecurityHasPrivilegesPrivileges>;
            cluster: Record<string, boolean>;
            hasAllClusterPrivileges: boolean;
            hasAllIndexPrivileges: boolean;
            hasAllPrivileges: boolean;
        };
        apmIndices: import("../../../../../../../platform/plugins/shared/apm_sources_access/server").APMIndices;
        apmIndexTemplates: Array<{
            name: string;
            isNonStandard: boolean;
            exists: boolean;
        }>;
        fleetPackageInfo: {
            isInstalled: boolean;
            version?: string;
        };
        kibanaVersion: string;
        elasticsearchVersion: string;
        apmEvents: import("../diagnostics/bundle/get_apm_events").ApmEvent[];
        invalidIndices?: import("../diagnostics/route").IndiciesItem[];
        validIndices?: import("../diagnostics/route").IndiciesItem[];
        dataStreams: import("@elastic/elasticsearch/lib/api/types").IndicesDataStream[];
        nonDataStreamIndices: string[];
        indexTemplatesByIndexPattern: Array<{
            indexPattern: string;
            indexTemplates: Array<{
                priority: number | undefined;
                isNonStandard: boolean;
                templateIndexPatterns: string[];
                templateName: string;
            }>;
        }>;
        params: {
            start: number;
            end: number;
            kuery?: string;
        };
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/mobile-services/{serviceName}/detailed_statistics": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/mobile-services/{serviceName}/detailed_statistics", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            serviceName: import("io-ts").StringC;
        }>;
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").PartialC<{
            offset: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            field: import("io-ts").StringC;
            fieldValues: import("io-ts").Type<string[], string, unknown>;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("../mobile/get_mobile_detailed_statistics_by_field").MobileDetailedStatisticsResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/mobile-services/{serviceName}/main_statistics": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/mobile-services/{serviceName}/main_statistics", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            serviceName: import("io-ts").StringC;
        }>;
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            field: import("io-ts").StringC;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("../mobile/get_mobile_main_statistics_by_field").MobileMainStatisticsResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/mobile-services/{serviceName}/terms": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/mobile-services/{serviceName}/terms", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            serviceName: import("io-ts").StringC;
        }>;
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            size: import("io-ts").Type<number, number, unknown>;
            fieldName: import("io-ts").StringC;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, {
        terms: import("../mobile/get_mobile_terms_by_field").MobileTermsByFieldResponse;
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/mobile-services/{serviceName}/location/stats": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/mobile-services/{serviceName}/location/stats", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            serviceName: import("io-ts").StringC;
        }>;
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").PartialC<{
            offset: import("io-ts").StringC;
        }>, import("io-ts").PartialC<{
            locationField: import("io-ts").StringC;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("../mobile/get_mobile_location_stats").MobileLocationStats, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/mobile-services/{serviceName}/stats": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/mobile-services/{serviceName}/stats", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            serviceName: import("io-ts").StringC;
        }>;
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").PartialC<{
            offset: import("io-ts").StringC;
        }>, import("io-ts").PartialC<{
            transactionType: import("io-ts").StringC;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("../mobile/get_mobile_stats").MobilePeriodStats, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/mobile-services/{serviceName}/transactions/charts/http_requests": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/mobile-services/{serviceName}/transactions/charts/http_requests", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            serviceName: import("io-ts").StringC;
        }>;
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").PartialC<{
            offset: import("io-ts").StringC;
        }>, import("io-ts").PartialC<{
            transactionType: import("io-ts").StringC;
            transactionName: import("io-ts").StringC;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("../mobile/get_mobile_http_requests").HttpRequestsTimeseries, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/mobile-services/{serviceName}/transactions/charts/sessions": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/mobile-services/{serviceName}/transactions/charts/sessions", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            serviceName: import("io-ts").StringC;
        }>;
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").PartialC<{
            offset: import("io-ts").StringC;
        }>, import("io-ts").PartialC<{
            transactionType: import("io-ts").StringC;
            transactionName: import("io-ts").StringC;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("../mobile/get_mobile_sessions").SessionsTimeseries, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/mobile-services/{serviceName}/most_used_charts": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/mobile-services/{serviceName}/most_used_charts", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            serviceName: import("io-ts").StringC;
        }>;
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").PartialC<{
            transactionType: import("io-ts").StringC;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, {
        mostUsedCharts: Array<{
            key: import("@kbn/apm-types").MobilePropertyType;
            options: import("../mobile/get_mobile_most_used_charts").MobileMostUsedChartResponse[number]["options"];
        }>;
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/mobile/filters": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/services/{serviceName}/mobile/filters", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            serviceName: import("io-ts").StringC;
        }>;
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").PartialC<{
            transactionType: import("io-ts").StringC;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, {
        mobileFilters: import("../mobile/get_mobile_filters").MobileFiltersResponse;
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/mobile-services/{serviceName}/crashes/distribution": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/mobile-services/{serviceName}/crashes/distribution", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            serviceName: import("io-ts").StringC;
        }>;
        query: import("io-ts").IntersectionC<[import("io-ts").PartialC<{
            groupId: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").PartialC<{
            offset: import("io-ts").StringC;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("../mobile/crashes/distribution/get_distribution").CrashDistributionResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/mobile-services/{serviceName}/crashes/groups/main_statistics": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/mobile-services/{serviceName}/crashes/groups/main_statistics", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            serviceName: import("io-ts").StringC;
        }>;
        query: import("io-ts").IntersectionC<[import("io-ts").PartialC<{
            sortField: import("io-ts").StringC;
            sortDirection: import("io-ts").UnionC<[import("io-ts").LiteralC<"asc">, import("io-ts").LiteralC<"desc">]>;
        }>, import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, {
        errorGroups: import("../mobile/crashes/get_crash_groups/get_crash_group_main_statistics").MobileCrashGroupMainStatisticsResponse;
    }, import("../typings").APMRouteCreateOptions>;
    "POST /internal/apm/mobile-services/{serviceName}/crashes/groups/detailed_statistics": import("@kbn/server-route-repository").ServerRoute<"POST /internal/apm/mobile-services/{serviceName}/crashes/groups/detailed_statistics", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            serviceName: import("io-ts").StringC;
        }>;
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").PartialC<{
            offset: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            numBuckets: import("io-ts").Type<number, number, unknown>;
        }>]>;
        body: import("io-ts").TypeC<{
            groupIds: import("io-ts").Type<string[], string, unknown>;
        }>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("../mobile/crashes/get_mobile_crash_group_detailed_statistics").MobileCrashesGroupPeriodsResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/mobile-services/{serviceName}/error_terms": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/mobile-services/{serviceName}/error_terms", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            serviceName: import("io-ts").StringC;
        }>;
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            size: import("io-ts").Type<number, number, unknown>;
            fieldName: import("io-ts").StringC;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, {
        terms: import("../mobile/errors/get_mobile_errors_terms_by_field").MobileErrorTermsByFieldResponse;
    }, import("../typings").APMRouteCreateOptions>;
    "POST /internal/apm/mobile-services/{serviceName}/errors/groups/detailed_statistics": import("@kbn/server-route-repository").ServerRoute<"POST /internal/apm/mobile-services/{serviceName}/errors/groups/detailed_statistics", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            serviceName: import("io-ts").StringC;
        }>;
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").PartialC<{
            offset: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            numBuckets: import("io-ts").Type<number, number, unknown>;
        }>]>;
        body: import("io-ts").TypeC<{
            groupIds: import("io-ts").Type<string[], string, unknown>;
        }>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("../mobile/errors/get_mobile_error_group_detailed_statistics").MobileErrorGroupPeriodsResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/mobile-services/{serviceName}/errors/groups/main_statistics": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/mobile-services/{serviceName}/errors/groups/main_statistics", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            serviceName: import("io-ts").StringC;
        }>;
        query: import("io-ts").IntersectionC<[import("io-ts").PartialC<{
            sortField: import("io-ts").StringC;
            sortDirection: import("io-ts").UnionC<[import("io-ts").LiteralC<"asc">, import("io-ts").LiteralC<"desc">]>;
        }>, import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, {
        errorGroups: import("../mobile/errors/get_mobile_error_group_main_statistics").MobileErrorGroupMainStatisticsResponse;
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/mobile-services/{serviceName}/error/http_error_rate": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/mobile-services/{serviceName}/error/http_error_rate", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            serviceName: import("io-ts").StringC;
        }>;
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").PartialC<{
            offset: import("io-ts").StringC;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("../mobile/errors/get_mobile_http_errors").MobileHttpErrorsTimeseries, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/agent_instances": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/services/{serviceName}/agent_instances", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            serviceName: import("io-ts").StringC;
        }>;
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").TypeC<{
            probability: import("io-ts").Type<number, number, unknown>;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, {
        items: import("../agent_explorer/get_agent_instances").AgentExplorerAgentInstancesResponse;
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/get_latest_agent_versions": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/get_latest_agent_versions", undefined, import("./register_apm_server_routes").APMRouteHandlerResources, import("../agent_explorer/fetch_agents_latest_version").AgentLatestVersionsResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/get_agents_per_service": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/get_agents_per_service", import("io-ts").TypeC<{
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").TypeC<{
            probability: import("io-ts").Type<number, number, unknown>;
        }>, import("io-ts").PartialC<{
            serviceName: import("io-ts").StringC;
            agentLanguage: import("io-ts").StringC;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("../agent_explorer/get_agents").AgentExplorerAgentsResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/time_range_metadata": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/time_range_metadata", import("io-ts").TypeC<{
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            useSpanName: import("io-ts").Type<boolean, boolean, unknown>;
        }>, import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("../../../common/time_range_metadata").TimeRangeMetadata, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/debug-telemetry": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/debug-telemetry", undefined, import("./register_apm_server_routes").APMRouteHandlerResources, import("utility-types").DeepPartial<import("../../lib/apm_telemetry/types").APMUsage>, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/infrastructure_attributes": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/services/{serviceName}/infrastructure_attributes", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            serviceName: import("io-ts").StringC;
        }>;
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").PartialC<{
            agentName: import("io-ts").StringC;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, {
        containerIds: string[];
        hostNames: string[];
        podNames: string[];
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/traces/{traceId}/span_links/{spanId}": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/traces/{traceId}/span_links/{spanId}", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            traceId: import("io-ts").StringC;
            spanId: import("io-ts").StringC;
        }>;
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").PartialC<{
            processorEvent: import("io-ts").UnionC<[import("io-ts").LiteralC<import("@kbn/apm-types-shared").ProcessorEvent.transaction>, import("io-ts").LiteralC<import("@kbn/apm-types-shared").ProcessorEvent.error>, import("io-ts").LiteralC<import("@kbn/apm-types-shared").ProcessorEvent.metric>, import("io-ts").LiteralC<import("@kbn/apm-types-shared").ProcessorEvent.span>]>;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, {
        outgoingSpanLinks: import("@kbn/apm-types").SpanLinkDetails[];
        incomingSpanLinks: import("@kbn/apm-types").SpanLinkDetails[];
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/traces/{traceId}/span_links/{spanId}/children": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/traces/{traceId}/span_links/{spanId}/children", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            traceId: import("io-ts").StringC;
            spanId: import("io-ts").StringC;
        }>;
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, {
        spanLinksDetails: import("@kbn/apm-types").SpanLinkDetails[];
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/traces/{traceId}/span_links/{spanId}/parents": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/traces/{traceId}/span_links/{spanId}/parents", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            traceId: import("io-ts").StringC;
            spanId: import("io-ts").StringC;
        }>;
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").TypeC<{
            processorEvent: import("io-ts").UnionC<[import("io-ts").LiteralC<import("@kbn/apm-types-shared").ProcessorEvent.transaction>, import("io-ts").LiteralC<import("@kbn/apm-types-shared").ProcessorEvent.error>, import("io-ts").LiteralC<import("@kbn/apm-types-shared").ProcessorEvent.metric>, import("io-ts").LiteralC<import("@kbn/apm-types-shared").ProcessorEvent.span>]>;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, {
        spanLinksDetails: import("@kbn/apm-types").SpanLinkDetails[];
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/storage_explorer/get_services": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/storage_explorer/get_services", import("io-ts").TypeC<{
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            indexLifecyclePhase: import("io-ts").UnionC<[import("io-ts").LiteralC<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.All>, import("io-ts").LiteralC<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Hot>, import("io-ts").LiteralC<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Warm>, import("io-ts").LiteralC<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Cold>, import("io-ts").LiteralC<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Frozen>]>;
        }>, import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, {
        services: Array<{
            serviceName: string;
        }>;
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/storage_explorer/is_cross_cluster_search": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/storage_explorer/is_cross_cluster_search", undefined, import("./register_apm_server_routes").APMRouteHandlerResources, {
        isCrossClusterSearch: boolean;
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/storage_explorer_summary_stats": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/storage_explorer_summary_stats", import("io-ts").TypeC<{
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            indexLifecyclePhase: import("io-ts").UnionC<[import("io-ts").LiteralC<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.All>, import("io-ts").LiteralC<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Hot>, import("io-ts").LiteralC<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Warm>, import("io-ts").LiteralC<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Cold>, import("io-ts").LiteralC<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Frozen>]>;
        }>, import("io-ts").TypeC<{
            probability: import("io-ts").Type<number, number, unknown>;
        }>, import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("../storage_explorer/get_summary_statistics").StorageExplorerSummaryStatisticsResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/storage_explorer/privileges": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/storage_explorer/privileges", undefined, import("./register_apm_server_routes").APMRouteHandlerResources, {
        hasPrivileges: boolean;
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/storage_chart": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/storage_chart", import("io-ts").TypeC<{
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            indexLifecyclePhase: import("io-ts").UnionC<[import("io-ts").LiteralC<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.All>, import("io-ts").LiteralC<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Hot>, import("io-ts").LiteralC<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Warm>, import("io-ts").LiteralC<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Cold>, import("io-ts").LiteralC<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Frozen>]>;
        }>, import("io-ts").TypeC<{
            probability: import("io-ts").Type<number, number, unknown>;
        }>, import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, {
        storageTimeSeries: import("../storage_explorer/get_size_timeseries").SizeTimeseriesResponse;
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/storage_details": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/services/{serviceName}/storage_details", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            serviceName: import("io-ts").StringC;
        }>;
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            indexLifecyclePhase: import("io-ts").UnionC<[import("io-ts").LiteralC<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.All>, import("io-ts").LiteralC<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Hot>, import("io-ts").LiteralC<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Warm>, import("io-ts").LiteralC<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Cold>, import("io-ts").LiteralC<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Frozen>]>;
        }>, import("io-ts").TypeC<{
            probability: import("io-ts").Type<number, number, unknown>;
        }>, import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("../storage_explorer/get_storage_details").StorageDetailsResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/storage_explorer": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/storage_explorer", import("io-ts").TypeC<{
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            indexLifecyclePhase: import("io-ts").UnionC<[import("io-ts").LiteralC<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.All>, import("io-ts").LiteralC<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Hot>, import("io-ts").LiteralC<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Warm>, import("io-ts").LiteralC<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Cold>, import("io-ts").LiteralC<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Frozen>]>;
        }>, import("io-ts").TypeC<{
            probability: import("io-ts").Type<number, number, unknown>;
        }>, import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, {
        serviceStatistics: import("../storage_explorer/get_service_statistics").StorageExplorerServiceStatisticsResponse;
    }, import("../typings").APMRouteCreateOptions>;
    "POST /api/apm/agent_keys 2023-10-31": import("@kbn/server-route-repository").ServerRoute<"POST /api/apm/agent_keys 2023-10-31", import("io-ts").TypeC<{
        body: import("io-ts").TypeC<{
            name: import("io-ts").StringC;
            privileges: import("io-ts").ArrayC<import("io-ts").UnionC<[import("io-ts").LiteralC<import("../../../common/privilege_type").PrivilegeType.EVENT>, import("io-ts").LiteralC<import("../../../common/privilege_type").PrivilegeType.AGENT_CONFIG>]>>;
        }>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("../agent_keys/create_agent_key").CreateAgentKeyResponse, import("../typings").APMRouteCreateOptions>;
    "POST /internal/apm/api_key/invalidate": import("@kbn/server-route-repository").ServerRoute<"POST /internal/apm/api_key/invalidate", import("io-ts").TypeC<{
        body: import("io-ts").TypeC<{
            id: import("io-ts").StringC;
        }>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("../agent_keys/invalidate_agent_key").InvalidateAgentKeyResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/agent_keys/privileges": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/agent_keys/privileges", undefined, import("./register_apm_server_routes").APMRouteHandlerResources, import("../agent_keys/get_agent_keys_privileges").AgentKeysPrivilegesResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/agent_keys": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/agent_keys", undefined, import("./register_apm_server_routes").APMRouteHandlerResources, import("../agent_keys/get_agent_keys").AgentKeysResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/event_metadata/{processorEvent}/{id}": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/event_metadata/{processorEvent}/{id}", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            processorEvent: import("io-ts").UnionC<[import("io-ts").LiteralC<import("@kbn/apm-types-shared").ProcessorEvent.transaction>, import("io-ts").LiteralC<import("@kbn/apm-types-shared").ProcessorEvent.error>, import("io-ts").LiteralC<import("@kbn/apm-types-shared").ProcessorEvent.metric>, import("io-ts").LiteralC<import("@kbn/apm-types-shared").ProcessorEvent.span>]>;
            id: import("io-ts").StringC;
        }>;
        query: import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, {
        metadata: Partial<Record<string, unknown[]>>;
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/has_data": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/has_data", undefined, import("./register_apm_server_routes").APMRouteHandlerResources, {
        hasData: boolean;
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/fallback_to_transactions": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/fallback_to_transactions", import("io-ts").PartialC<{
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").PartialC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, {
        fallbackToTransactions: boolean;
    }, import("../typings").APMRouteCreateOptions>;
    "POST /internal/apm/correlations": import("@kbn/server-route-repository").ServerRoute<"POST /internal/apm/correlations", import("io-ts").TypeC<{
        body: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            entityType: import("io-ts").UnionC<[import("io-ts").LiteralC<"transaction">, import("io-ts").LiteralC<"exit_span">]>;
            metric: import("io-ts").UnionC<[import("io-ts").LiteralC<"latency">, import("io-ts").LiteralC<"failure_rate">]>;
        }>, import("io-ts").PartialC<{
            fieldCandidates: import("io-ts").ArrayC<import("io-ts").StringC>;
            durationMin: import("io-ts").Type<number, number, unknown>;
            durationMax: import("io-ts").Type<number, number, unknown>;
            percentileThreshold: import("io-ts").Type<number, number, unknown>;
            includeHistogram: import("io-ts").Type<boolean, boolean, unknown>;
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("@kbn/apm-types").CorrelationsResponse, import("../typings").APMRouteCreateOptions>;
    "POST /internal/apm/correlations/p_values/transactions": import("@kbn/server-route-repository").ServerRoute<"POST /internal/apm/correlations/p_values/transactions", import("io-ts").TypeC<{
        body: import("io-ts").IntersectionC<[import("io-ts").PartialC<{
            serviceName: import("io-ts").StringC;
            transactionName: import("io-ts").StringC;
            transactionType: import("io-ts").StringC;
            durationMin: import("io-ts").Type<number, number, unknown>;
            durationMax: import("io-ts").Type<number, number, unknown>;
        }>, import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").TypeC<{
            fieldCandidates: import("io-ts").ArrayC<import("io-ts").StringC>;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("../correlations/queries/fetch_p_values").PValuesResponse, import("../typings").APMRouteCreateOptions>;
    "POST /internal/apm/correlations/significant_correlations/transactions": import("@kbn/server-route-repository").ServerRoute<"POST /internal/apm/correlations/significant_correlations/transactions", import("io-ts").TypeC<{
        body: import("io-ts").IntersectionC<[import("io-ts").PartialC<{
            serviceName: import("io-ts").StringC;
            transactionName: import("io-ts").StringC;
            transactionType: import("io-ts").StringC;
            durationMin: import("io-ts").Type<number, number, unknown>;
            durationMax: import("io-ts").Type<number, number, unknown>;
        }>, import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").TypeC<{
            fieldValuePairs: import("io-ts").ArrayC<import("io-ts").TypeC<{
                fieldName: import("io-ts").StringC;
                fieldValue: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").Type<number, number, unknown>]>;
            }>>;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("../correlations/queries/fetch_significant_correlations").SignificantCorrelationsResponse, import("../typings").APMRouteCreateOptions>;
    "POST /internal/apm/correlations/field_value_pairs/transactions": import("@kbn/server-route-repository").ServerRoute<"POST /internal/apm/correlations/field_value_pairs/transactions", import("io-ts").TypeC<{
        body: import("io-ts").IntersectionC<[import("io-ts").PartialC<{
            serviceName: import("io-ts").StringC;
            transactionName: import("io-ts").StringC;
            transactionType: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").TypeC<{
            fieldCandidates: import("io-ts").ArrayC<import("io-ts").StringC>;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("../correlations/queries/fetch_field_value_pairs").FieldValuePairsResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/correlations/field_value_stats/transactions": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/correlations/field_value_stats/transactions", import("io-ts").TypeC<{
        query: import("io-ts").IntersectionC<[import("io-ts").PartialC<{
            serviceName: import("io-ts").StringC;
            transactionName: import("io-ts").StringC;
            transactionType: import("io-ts").StringC;
            samplerShardSize: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").TypeC<{
            fieldName: import("io-ts").StringC;
            fieldValue: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").NumberC]>;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("@kbn/apm-types").TopValuesStats, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/correlations/field_candidates/transactions": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/correlations/field_candidates/transactions", import("io-ts").TypeC<{
        query: import("io-ts").IntersectionC<[import("io-ts").PartialC<{
            serviceName: import("io-ts").StringC;
            transactionName: import("io-ts").StringC;
            transactionType: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("../correlations/queries/fetch_duration_field_candidates").DurationFieldCandidatesResponse, import("../typings").APMRouteCreateOptions>;
    "POST /internal/apm/dependencies/top_dependencies/statistics": import("@kbn/server-route-repository").ServerRoute<"POST /internal/apm/dependencies/top_dependencies/statistics", import("io-ts").TypeC<{
        query: import("io-ts").IntersectionC<[import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").PartialC<{
            offset: import("io-ts").StringC;
        }>]>, import("io-ts").TypeC<{
            numBuckets: import("io-ts").Type<number, number, unknown>;
        }>]>;
        body: import("io-ts").TypeC<{
            dependencyNames: import("io-ts").Type<string[], string, unknown>;
        }>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("../dependencies/get_dependencies_timeseries_statistics").DependenciesTimeseriesStatisticsResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/dependencies/operations/spans": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/dependencies/operations/spans", import("io-ts").TypeC<{
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            dependencyName: import("io-ts").StringC;
            spanName: import("io-ts").StringC;
        }>, import("io-ts").PartialC<{
            sampleRangeFrom: import("io-ts").Type<number, number, unknown>;
            sampleRangeTo: import("io-ts").Type<number, number, unknown>;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, {
        spans: import("../dependencies/get_top_dependency_spans").DependencySpan[];
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/dependencies/charts/distribution": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/dependencies/charts/distribution", import("io-ts").TypeC<{
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            dependencyName: import("io-ts").StringC;
            spanName: import("io-ts").StringC;
            percentileThreshold: import("io-ts").Type<number, number, unknown>;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("../dependencies/get_dependency_latency_distribution").DependencyLatencyDistributionResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/dependencies/operations": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/dependencies/operations", import("io-ts").TypeC<{
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").PartialC<{
            offset: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            dependencyName: import("io-ts").StringC;
            searchServiceDestinationMetrics: import("io-ts").Type<boolean, boolean, unknown>;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, {
        operations: import("../dependencies/get_top_dependency_operations").DependencyOperation[];
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/dependencies/charts/error_rate": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/dependencies/charts/error_rate", import("io-ts").TypeC<{
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            dependencyName: import("io-ts").StringC;
            spanName: import("io-ts").StringC;
            searchServiceDestinationMetrics: import("io-ts").Type<boolean, boolean, unknown>;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").PartialC<{
            offset: import("io-ts").StringC;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, {
        currentTimeseries: Array<{
            x: number;
            y: number;
        }>;
        comparisonTimeseries: Array<{
            x: number;
            y: number;
        }> | null;
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/dependencies/charts/throughput": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/dependencies/charts/throughput", import("io-ts").TypeC<{
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            dependencyName: import("io-ts").StringC;
            spanName: import("io-ts").StringC;
            searchServiceDestinationMetrics: import("io-ts").Type<boolean, boolean, unknown>;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").PartialC<{
            offset: import("io-ts").StringC;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("../dependencies/get_throughput_charts_for_dependency").ThroughputChartsForDependencyResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/dependencies/charts/latency": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/dependencies/charts/latency", import("io-ts").TypeC<{
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            dependencyName: import("io-ts").StringC;
            spanName: import("io-ts").StringC;
            searchServiceDestinationMetrics: import("io-ts").Type<boolean, boolean, unknown>;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").PartialC<{
            offset: import("io-ts").StringC;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("../dependencies/get_latency_charts_for_dependency").LatencyChartsDependencyResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/dependencies/metadata": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/dependencies/metadata", import("io-ts").TypeC<{
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            dependencyName: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, {
        metadata: import("../dependencies/get_metadata_for_dependency").MetadataForDependencyResponse;
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/dependencies/upstream_services": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/dependencies/upstream_services", import("io-ts").IntersectionC<[import("io-ts").TypeC<{
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            dependencyName: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").TypeC<{
            numBuckets: import("io-ts").Type<number, number, unknown>;
        }>]>;
    }>, import("io-ts").PartialC<{
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").PartialC<{
            offset: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>]>;
    }>]>, import("./register_apm_server_routes").APMRouteHandlerResources, import("../dependencies/get_upstream_services_for_dependency").UpstreamServicesForDependencyResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/dependencies/top_dependencies": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/dependencies/top_dependencies", import("io-ts").TypeC<{
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            numBuckets: import("io-ts").Type<number, number, unknown>;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("../dependencies/get_top_dependencies").TopDependenciesResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/fleet/java_agent_versions": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/fleet/java_agent_versions", undefined, import("./register_apm_server_routes").APMRouteHandlerResources, {
        versions: string[] | undefined;
    }, import("../typings").APMRouteCreateOptions>;
    "POST /internal/apm/fleet/cloud_apm_package_policy": import("@kbn/server-route-repository").ServerRoute<"POST /internal/apm/fleet/cloud_apm_package_policy", undefined, import("./register_apm_server_routes").APMRouteHandlerResources, {
        cloudApmPackagePolicy: import("@kbn/fleet-plugin/common").PackagePolicy;
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/fleet/migration_check": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/fleet/migration_check", undefined, import("./register_apm_server_routes").APMRouteHandlerResources, import("../fleet/run_migration_check").RunMigrationCheckResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/fleet/apm_server_schema/unsupported": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/fleet/apm_server_schema/unsupported", undefined, import("./register_apm_server_routes").APMRouteHandlerResources, {
        unsupported: import("../fleet/get_unsupported_apm_server_schema").UnsupportedApmServerSchema;
    }, import("../typings").APMRouteCreateOptions>;
    "POST /api/apm/fleet/apm_server_schema 2023-10-31": import("@kbn/server-route-repository").ServerRoute<"POST /api/apm/fleet/apm_server_schema 2023-10-31", import("io-ts").TypeC<{
        body: import("io-ts").TypeC<{
            schema: import("io-ts").RecordC<import("io-ts").StringC, import("io-ts").UnknownC>;
        }>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, void, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/fleet/agents": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/fleet/agents", undefined, import("./register_apm_server_routes").APMRouteHandlerResources, import("../fleet/get_agents").FleetAgentResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/fleet/has_apm_policies": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/fleet/has_apm_policies", undefined, import("./register_apm_server_routes").APMRouteHandlerResources, {
        hasApmPolicies: boolean;
    }, import("../typings").APMRouteCreateOptions>;
    "POST /internal/apm/sourcemaps/migrate_fleet_artifacts": import("@kbn/server-route-repository").ServerRoute<"POST /internal/apm/sourcemaps/migrate_fleet_artifacts", undefined, import("./register_apm_server_routes").APMRouteHandlerResources, void, import("../typings").APMRouteCreateOptions>;
    "DELETE /api/apm/sourcemaps/{id} 2023-10-31": import("@kbn/server-route-repository").ServerRoute<"DELETE /api/apm/sourcemaps/{id} 2023-10-31", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            id: import("io-ts").StringC;
        }>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, void, import("../typings").APMRouteCreateOptions>;
    "POST /api/apm/sourcemaps 2023-10-31": import("@kbn/server-route-repository").ServerRoute<"POST /api/apm/sourcemaps 2023-10-31", import("io-ts").TypeC<{
        body: import("io-ts").TypeC<{
            service_name: import("io-ts").StringC;
            service_version: import("io-ts").StringC;
            bundle_filepath: import("io-ts").StringC;
            sourcemap: import("io-ts").Type<{
                version: number;
                sources: string[];
                mappings: string;
            } & {
                names?: string[] | undefined;
                file?: string | undefined;
                sourceRoot?: string | undefined;
                sourcesContent?: (string | null)[] | undefined;
            }, string | Buffer<ArrayBufferLike>, unknown>;
        }>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("@kbn/fleet-plugin/server").Artifact | undefined, import("../typings").APMRouteCreateOptions>;
    "GET /api/apm/sourcemaps 2023-10-31": import("@kbn/server-route-repository").ServerRoute<"GET /api/apm/sourcemaps 2023-10-31", import("io-ts").PartialC<{
        query: import("io-ts").PartialC<{
            page: import("io-ts").Type<number, number, unknown>;
            perPage: import("io-ts").Type<number, number, unknown>;
        }>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("../fleet/source_maps").ListSourceMapArtifactsResponse | undefined, import("../typings").APMRouteCreateOptions>;
    "DELETE /internal/apm/settings/custom_links/{id}": import("@kbn/server-route-repository").ServerRoute<"DELETE /internal/apm/settings/custom_links/{id}", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            id: import("io-ts").StringC;
        }>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, {
        result: string;
    }, import("../typings").APMRouteCreateOptions>;
    "PUT /internal/apm/settings/custom_links/{id}": import("@kbn/server-route-repository").ServerRoute<"PUT /internal/apm/settings/custom_links/{id}", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            id: import("io-ts").StringC;
        }>;
        body: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            label: import("io-ts").StringC;
            url: import("io-ts").StringC;
        }>, import("io-ts").PartialC<{
            id: import("io-ts").StringC;
            filters: import("io-ts").ArrayC<import("io-ts").TypeC<{
                key: import("io-ts").UnionC<[import("io-ts").LiteralC<"">, import("io-ts").KeyofC<{
                    'service.name': import("io-ts").StringC;
                    'service.environment': import("io-ts").StringC;
                    'transaction.name': import("io-ts").StringC;
                    'transaction.type': import("io-ts").StringC;
                }>]>;
                value: import("io-ts").StringC;
            }>>;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, void, import("../typings").APMRouteCreateOptions>;
    "POST /internal/apm/settings/custom_links": import("@kbn/server-route-repository").ServerRoute<"POST /internal/apm/settings/custom_links", import("io-ts").TypeC<{
        body: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            label: import("io-ts").StringC;
            url: import("io-ts").StringC;
        }>, import("io-ts").PartialC<{
            id: import("io-ts").StringC;
            filters: import("io-ts").ArrayC<import("io-ts").TypeC<{
                key: import("io-ts").UnionC<[import("io-ts").LiteralC<"">, import("io-ts").KeyofC<{
                    'service.name': import("io-ts").StringC;
                    'service.environment': import("io-ts").StringC;
                    'transaction.name': import("io-ts").StringC;
                    'transaction.type': import("io-ts").StringC;
                }>]>;
                value: import("io-ts").StringC;
            }>>;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, void, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/settings/custom_links": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/settings/custom_links", import("io-ts").PartialC<{
        query: import("io-ts").PartialC<{
            'service.name': import("io-ts").StringC;
            'service.environment': import("io-ts").StringC;
            'transaction.name': import("io-ts").StringC;
            'transaction.type': import("io-ts").StringC;
        }>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, {
        customLinks: import("@kbn/apm-types").CustomLink[];
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/settings/custom_links/transaction": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/settings/custom_links/transaction", import("io-ts").PartialC<{
        query: import("io-ts").PartialC<{
            'service.name': import("io-ts").StringC;
            'service.environment': import("io-ts").StringC;
            'transaction.name': import("io-ts").StringC;
            'transaction.type': import("io-ts").StringC;
        }>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("@kbn/apm-types").Transaction, import("../typings").APMRouteCreateOptions>;
    "POST /internal/apm/settings/anomaly-detection/update_to_v3": import("@kbn/server-route-repository").ServerRoute<"POST /internal/apm/settings/anomaly-detection/update_to_v3", undefined, import("./register_apm_server_routes").APMRouteHandlerResources, {
        update: boolean;
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/settings/anomaly-detection/environments": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/settings/anomaly-detection/environments", undefined, import("./register_apm_server_routes").APMRouteHandlerResources, {
        environments: string[];
    }, import("../typings").APMRouteCreateOptions>;
    "POST /internal/apm/settings/anomaly-detection/jobs": import("@kbn/server-route-repository").ServerRoute<"POST /internal/apm/settings/anomaly-detection/jobs", import("io-ts").TypeC<{
        body: import("io-ts").TypeC<{
            environments: import("io-ts").ArrayC<import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>>;
        }>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, {
        jobCreated: true;
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/settings/anomaly-detection/jobs": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/settings/anomaly-detection/jobs", undefined, import("./register_apm_server_routes").APMRouteHandlerResources, {
        jobs: import("@kbn/apm-types").ApmMlJob[];
        hasLegacyJobs: boolean;
    }, import("../typings").APMRouteCreateOptions>;
    "GET /api/apm/settings/agent-configuration/agent_name 2023-10-31": import("@kbn/server-route-repository").ServerRoute<"GET /api/apm/settings/agent-configuration/agent_name 2023-10-31", import("io-ts").TypeC<{
        query: import("io-ts").TypeC<{
            serviceName: import("io-ts").StringC;
        }>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, {
        agentName: string | undefined;
    }, import("../typings").APMRouteCreateOptions>;
    "GET /api/apm/settings/agent-configuration/environments 2023-10-31": import("@kbn/server-route-repository").ServerRoute<"GET /api/apm/settings/agent-configuration/environments 2023-10-31", import("io-ts").PartialC<{
        query: import("io-ts").PartialC<{
            serviceName: import("io-ts").StringC;
        }>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, {
        environments: import("../settings/agent_configuration/get_environments").EnvironmentsResponse;
    }, import("../typings").APMRouteCreateOptions>;
    "POST /api/apm/settings/agent-configuration/search 2023-10-31": import("@kbn/server-route-repository").ServerRoute<"POST /api/apm/settings/agent-configuration/search 2023-10-31", import("io-ts").TypeC<{
        body: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            service: import("io-ts").PartialC<{
                name: import("io-ts").StringC;
                environment: import("io-ts").StringC;
            }>;
        }>, import("io-ts").PartialC<{
            etag: import("io-ts").StringC;
            mark_as_applied_by_agent: import("io-ts").BooleanC;
            error: import("io-ts").StringC;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("@kbn/es-types").SearchHit<import("../../../common/agent_configuration/configuration_types").AgentConfiguration, undefined, undefined> | null, import("../typings").APMRouteCreateOptions>;
    "PUT /api/apm/settings/agent-configuration 2023-10-31": import("@kbn/server-route-repository").ServerRoute<"PUT /api/apm/settings/agent-configuration 2023-10-31", import("io-ts").IntersectionC<[import("io-ts").PartialC<{
        query: import("io-ts").PartialC<{
            overwrite: import("io-ts").Type<boolean, boolean, unknown>;
        }>;
    }>, import("io-ts").TypeC<{
        body: import("io-ts").IntersectionC<[import("io-ts").PartialC<{
            agent_name: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            service: import("io-ts").PartialC<{
                name: import("io-ts").StringC;
                environment: import("io-ts").StringC;
            }>;
            settings: import("io-ts").IntersectionC<[import("io-ts").RecordC<import("io-ts").StringC, import("io-ts").StringC>, import("io-ts").PartialC<Record<string, import("../../../common/agent_configuration/setting_definitions/types").SettingValidation>>]>;
        }>]>;
    }>]>, import("./register_apm_server_routes").APMRouteHandlerResources, void, import("../typings").APMRouteCreateOptions>;
    "DELETE /api/apm/settings/agent-configuration 2023-10-31": import("@kbn/server-route-repository").ServerRoute<"DELETE /api/apm/settings/agent-configuration 2023-10-31", import("io-ts").TypeC<{
        body: import("io-ts").TypeC<{
            service: import("io-ts").PartialC<{
                name: import("io-ts").StringC;
                environment: import("io-ts").StringC;
            }>;
        }>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, {
        result: string;
    }, import("../typings").APMRouteCreateOptions>;
    "GET /api/apm/settings/agent-configuration/view 2023-10-31": import("@kbn/server-route-repository").ServerRoute<"GET /api/apm/settings/agent-configuration/view 2023-10-31", import("io-ts").PartialC<{
        query: import("io-ts").PartialC<{
            name: import("io-ts").StringC;
            environment: import("io-ts").StringC;
        }>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("../../../common/agent_configuration/configuration_types").AgentConfiguration, import("../typings").APMRouteCreateOptions>;
    "GET /api/apm/settings/agent-configuration 2023-10-31": import("@kbn/server-route-repository").ServerRoute<"GET /api/apm/settings/agent-configuration 2023-10-31", undefined, import("./register_apm_server_routes").APMRouteHandlerResources, {
        configurations: import("../../../common/agent_configuration/configuration_types").AgentConfiguration[];
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/rule_types/transaction_duration/chart_preview": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/rule_types/transaction_duration/chart_preview", import("io-ts").TypeC<{
        query: import("io-ts").IntersectionC<[import("io-ts").PartialC<{
            aggregationType: import("io-ts").UnionC<[import("io-ts").LiteralC<import("@kbn/apm-types").AggregationType.Avg>, import("io-ts").LiteralC<import("@kbn/apm-types").AggregationType.P95>, import("io-ts").LiteralC<import("@kbn/apm-types").AggregationType.P99>]>;
            serviceName: import("io-ts").StringC;
            errorGroupingKey: import("io-ts").StringC;
            transactionType: import("io-ts").StringC;
            transactionName: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").TypeC<{
            interval: import("io-ts").StringC;
        }>, import("io-ts").PartialC<{
            groupBy: import("io-ts").ArrayC<import("io-ts").StringC>;
            searchConfiguration: import("io-ts").Type<{
                query: {
                    query: string | {
                        [x: string]: any;
                    };
                    language: string;
                };
            }, string, unknown>;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, {
        latencyChartPreview: import("../alerts/route").PreviewChartResponse;
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/rule_types/error_count/chart_preview": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/rule_types/error_count/chart_preview", import("io-ts").TypeC<{
        query: import("io-ts").IntersectionC<[import("io-ts").PartialC<{
            aggregationType: import("io-ts").UnionC<[import("io-ts").LiteralC<import("@kbn/apm-types").AggregationType.Avg>, import("io-ts").LiteralC<import("@kbn/apm-types").AggregationType.P95>, import("io-ts").LiteralC<import("@kbn/apm-types").AggregationType.P99>]>;
            serviceName: import("io-ts").StringC;
            errorGroupingKey: import("io-ts").StringC;
            transactionType: import("io-ts").StringC;
            transactionName: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").TypeC<{
            interval: import("io-ts").StringC;
        }>, import("io-ts").PartialC<{
            groupBy: import("io-ts").ArrayC<import("io-ts").StringC>;
            searchConfiguration: import("io-ts").Type<{
                query: {
                    query: string | {
                        [x: string]: any;
                    };
                    language: string;
                };
            }, string, unknown>;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, {
        errorCountChartPreview: import("../alerts/route").PreviewChartResponse;
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/rule_types/transaction_error_rate/chart_preview": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/rule_types/transaction_error_rate/chart_preview", import("io-ts").TypeC<{
        query: import("io-ts").IntersectionC<[import("io-ts").PartialC<{
            aggregationType: import("io-ts").UnionC<[import("io-ts").LiteralC<import("@kbn/apm-types").AggregationType.Avg>, import("io-ts").LiteralC<import("@kbn/apm-types").AggregationType.P95>, import("io-ts").LiteralC<import("@kbn/apm-types").AggregationType.P99>]>;
            serviceName: import("io-ts").StringC;
            errorGroupingKey: import("io-ts").StringC;
            transactionType: import("io-ts").StringC;
            transactionName: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").TypeC<{
            interval: import("io-ts").StringC;
        }>, import("io-ts").PartialC<{
            groupBy: import("io-ts").ArrayC<import("io-ts").StringC>;
            searchConfiguration: import("io-ts").Type<{
                query: {
                    query: string | {
                        [x: string]: any;
                    };
                    language: string;
                };
            }, string, unknown>;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, {
        errorRateChartPreview: import("../alerts/route").PreviewChartResponse;
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/transactions/charts/coldstart_rate_by_transaction_name": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/services/{serviceName}/transactions/charts/coldstart_rate_by_transaction_name", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            serviceName: import("io-ts").StringC;
        }>;
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            transactionType: import("io-ts").StringC;
            transactionName: import("io-ts").StringC;
        }>, import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").PartialC<{
            offset: import("io-ts").StringC;
        }>]>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("../../lib/transaction_groups/get_coldstart_rate").ColdstartRateResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/transactions/charts/coldstart_rate": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/services/{serviceName}/transactions/charts/coldstart_rate", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            serviceName: import("io-ts").StringC;
        }>;
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            transactionType: import("io-ts").StringC;
        }>, import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").PartialC<{
            offset: import("io-ts").StringC;
        }>]>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("../../lib/transaction_groups/get_coldstart_rate").ColdstartRateResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/transactions/charts/error_rate": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/services/{serviceName}/transactions/charts/error_rate", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            serviceName: import("io-ts").StringC;
        }>;
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            transactionType: import("io-ts").StringC;
            bucketSizeInSeconds: import("io-ts").Type<number, number, unknown>;
        }>, import("io-ts").PartialC<{
            transactionName: import("io-ts").StringC;
            filters: import("io-ts").Type<import("@kbn/es-query").BoolQuery, string, unknown>;
        }>, import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").PartialC<{
            offset: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            documentType: import("io-ts").UnionC<[import("io-ts").LiteralC<import("../../../common/document_type").ApmDocumentType.ServiceTransactionMetric>, import("io-ts").LiteralC<import("../../../common/document_type").ApmDocumentType.TransactionMetric>, import("io-ts").LiteralC<import("../../../common/document_type").ApmDocumentType.TransactionEvent>]>;
            rollupInterval: import("io-ts").UnionC<[import("io-ts").LiteralC<import("../../../common/rollup").RollupInterval.OneMinute>, import("io-ts").LiteralC<import("../../../common/rollup").RollupInterval.TenMinutes>, import("io-ts").LiteralC<import("../../../common/rollup").RollupInterval.SixtyMinutes>, import("io-ts").LiteralC<import("../../../common/rollup").RollupInterval.None>]>;
        }>]>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("../transactions/get_failed_transaction_rate_periods").FailedTransactionRateResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/transaction/charts/breakdown": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/services/{serviceName}/transaction/charts/breakdown", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            serviceName: import("io-ts").StringC;
        }>;
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            transactionType: import("io-ts").StringC;
        }>, import("io-ts").PartialC<{
            transactionName: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("../transactions/breakdown").TransactionBreakdownResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/transactions/traces/samples": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/services/{serviceName}/transactions/traces/samples", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            serviceName: import("io-ts").StringC;
        }>;
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            transactionType: import("io-ts").StringC;
            transactionName: import("io-ts").StringC;
        }>, import("io-ts").PartialC<{
            transactionId: import("io-ts").StringC;
            traceId: import("io-ts").StringC;
            sampleRangeFrom: import("io-ts").Type<number, number, unknown>;
            sampleRangeTo: import("io-ts").Type<number, number, unknown>;
        }>, import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("../transactions/trace_samples").TransactionTraceSamplesResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/transactions/charts/latency": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/services/{serviceName}/transactions/charts/latency", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            serviceName: import("io-ts").StringC;
        }>;
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            latencyAggregationType: import("io-ts").UnionC<[import("io-ts").LiteralC<import("@kbn/apm-types").LatencyAggregationType.avg>, import("io-ts").LiteralC<import("@kbn/apm-types").LatencyAggregationType.p95>, import("io-ts").LiteralC<import("@kbn/apm-types").LatencyAggregationType.p99>]>;
            bucketSizeInSeconds: import("io-ts").Type<number, number, unknown>;
            useDurationSummary: import("io-ts").Type<boolean, boolean, unknown>;
        }>, import("io-ts").PartialC<{
            transactionType: import("io-ts").StringC;
            transactionName: import("io-ts").StringC;
            filters: import("io-ts").Type<import("@kbn/es-query").BoolQuery, string, unknown>;
        }>, import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").PartialC<{
            offset: import("io-ts").StringC;
        }>]>, import("io-ts").TypeC<{
            documentType: import("io-ts").UnionC<[import("io-ts").LiteralC<import("../../../common/document_type").ApmDocumentType.ServiceTransactionMetric>, import("io-ts").LiteralC<import("../../../common/document_type").ApmDocumentType.TransactionMetric>, import("io-ts").LiteralC<import("../../../common/document_type").ApmDocumentType.TransactionEvent>]>;
            rollupInterval: import("io-ts").UnionC<[import("io-ts").LiteralC<import("../../../common/rollup").RollupInterval.OneMinute>, import("io-ts").LiteralC<import("../../../common/rollup").RollupInterval.TenMinutes>, import("io-ts").LiteralC<import("../../../common/rollup").RollupInterval.SixtyMinutes>, import("io-ts").LiteralC<import("../../../common/rollup").RollupInterval.None>]>;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("../transactions/get_latency_charts").TransactionLatencyResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/transactions/groups/detailed_statistics": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/services/{serviceName}/transactions/groups/detailed_statistics", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            serviceName: import("io-ts").StringC;
        }>;
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").IntersectionC<[import("io-ts").PartialC<{
            offset: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            documentType: import("io-ts").UnionC<[import("io-ts").LiteralC<import("../../../common/document_type").ApmDocumentType.TransactionMetric>, import("io-ts").LiteralC<import("../../../common/document_type").ApmDocumentType.TransactionEvent>]>;
            rollupInterval: import("io-ts").UnionC<[import("io-ts").LiteralC<import("../../../common/rollup").RollupInterval.OneMinute>, import("io-ts").LiteralC<import("../../../common/rollup").RollupInterval.TenMinutes>, import("io-ts").LiteralC<import("../../../common/rollup").RollupInterval.SixtyMinutes>, import("io-ts").LiteralC<import("../../../common/rollup").RollupInterval.None>]>;
        }>, import("io-ts").TypeC<{
            bucketSizeInSeconds: import("io-ts").Type<number, number, unknown>;
            useDurationSummary: import("io-ts").Type<boolean, boolean, unknown>;
        }>]>, import("io-ts").TypeC<{
            transactionNames: import("io-ts").Type<string[], string, unknown>;
            transactionType: import("io-ts").StringC;
            latencyAggregationType: import("io-ts").UnionC<[import("io-ts").LiteralC<import("@kbn/apm-types").LatencyAggregationType.avg>, import("io-ts").LiteralC<import("@kbn/apm-types").LatencyAggregationType.p95>, import("io-ts").LiteralC<import("@kbn/apm-types").LatencyAggregationType.p99>]>;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("../services/get_service_transaction_group_detailed_statistics").ServiceTransactionGroupDetailedStatisticsResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/transactions/groups/main_statistics": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/services/{serviceName}/transactions/groups/main_statistics", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            serviceName: import("io-ts").StringC;
        }>;
        query: import("io-ts").IntersectionC<[import("io-ts").PartialC<{
            searchQuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
            useDurationSummary: import("io-ts").Type<boolean, boolean, unknown>;
            transactionType: import("io-ts").StringC;
            latencyAggregationType: import("io-ts").UnionC<[import("io-ts").LiteralC<import("@kbn/apm-types").LatencyAggregationType.avg>, import("io-ts").LiteralC<import("@kbn/apm-types").LatencyAggregationType.p95>, import("io-ts").LiteralC<import("@kbn/apm-types").LatencyAggregationType.p99>]>;
        }>, import("io-ts").TypeC<{
            documentType: import("io-ts").UnionC<[import("io-ts").LiteralC<import("../../../common/document_type").ApmDocumentType.TransactionMetric>, import("io-ts").LiteralC<import("../../../common/document_type").ApmDocumentType.TransactionEvent>]>;
            rollupInterval: import("io-ts").UnionC<[import("io-ts").LiteralC<import("../../../common/rollup").RollupInterval.OneMinute>, import("io-ts").LiteralC<import("../../../common/rollup").RollupInterval.TenMinutes>, import("io-ts").LiteralC<import("../../../common/rollup").RollupInterval.SixtyMinutes>, import("io-ts").LiteralC<import("../../../common/rollup").RollupInterval.None>]>;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("../transactions/route").MergedServiceTransactionGroupsResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/unified_traces/{traceId}/spans/{spanId}": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/unified_traces/{traceId}/spans/{spanId}", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            traceId: import("io-ts").StringC;
            spanId: import("io-ts").StringC;
        }>;
        query: import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("@kbn/apm-types").UnifiedSpanDocument | undefined, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/unified_traces/{traceId}/errors": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/unified_traces/{traceId}/errors", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            traceId: import("io-ts").StringC;
        }>;
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").PartialC<{
            docId: import("io-ts").StringC;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("@kbn/apm-types").ErrorsByTraceId, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/unified_traces/{traceId}/summary": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/unified_traces/{traceId}/summary", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            traceId: import("io-ts").StringC;
        }>;
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").PartialC<{
            maxTraceItems: import("io-ts").Type<number, number, unknown>;
            docId: import("io-ts").StringC;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, {
        traceItems?: import("@kbn/apm-types").FocusedTraceItems;
        summary: {
            services: number;
            traceEvents: number;
            errors: number;
        };
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/transactions": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/transactions", import("io-ts").TypeC<{
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").TypeC<{
            transactionName: import("io-ts").StringC;
            serviceName: import("io-ts").StringC;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, {
        transaction?: import("@kbn/apm-types").TransactionDetailRedirectInfo;
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/traces/{traceId}/spans/{spanId}": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/traces/{traceId}/spans/{spanId}", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            traceId: import("io-ts").StringC;
            spanId: import("io-ts").StringC;
        }>;
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").UnionC<[import("io-ts").PartialC<{
            parentTransactionId: import("io-ts").StringC;
        }>, import("io-ts").UndefinedC]>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, {
        span?: import("@kbn/apm-types").Span;
        parentTransaction?: import("@kbn/apm-types").Transaction;
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/traces/{traceId}/transactions/{transactionId}": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/traces/{traceId}/transactions/{transactionId}", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            traceId: import("io-ts").StringC;
            transactionId: import("io-ts").StringC;
        }>;
        query: import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("@kbn/apm-types").Transaction | undefined, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/transactions/{transactionId}": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/transactions/{transactionId}", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            transactionId: import("io-ts").StringC;
        }>;
        query: import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, {
        transaction?: import("@kbn/apm-types").Transaction;
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/unified_traces/{traceId}/root_span": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/unified_traces/{traceId}/root_span", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            traceId: import("io-ts").StringC;
        }>;
        query: import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("@kbn/apm-types").TraceRootSpan | undefined, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/traces/{traceId}/root_transaction": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/traces/{traceId}/root_transaction", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            traceId: import("io-ts").StringC;
        }>;
        query: import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, {
        transaction?: import("@kbn/apm-types").TransactionDetailRedirectInfo;
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/traces": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/traces", import("io-ts").TypeC<{
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").TypeC<{
            probability: import("io-ts").Type<number, number, unknown>;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("../traces/get_top_traces_primary_stats").TopTracesPrimaryStatsResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/unified_traces/{traceId}": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/unified_traces/{traceId}", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            traceId: import("io-ts").StringC;
        }>;
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").PartialC<{
            serviceName: import("io-ts").StringC;
            entryTransactionId: import("io-ts").StringC;
            ecsOnly: import("io-ts").Type<boolean, boolean, unknown>;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, {
        traceItems: import("@kbn/apm-types").TraceItem[];
        errors: import("@kbn/apm-types").Error[];
        agentMarks: Record<string, number>;
        entryTransaction?: import("@kbn/apm-types").Transaction;
        traceDocsTotal: number;
        maxTraceItems: number;
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/suggestions": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/suggestions", import("io-ts").TypeC<{
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            fieldName: import("io-ts").StringC;
            fieldValue: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").PartialC<{
            serviceName: import("io-ts").StringC;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, {
        terms: string[];
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/service-group/counts": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/service-group/counts", undefined, import("./register_apm_server_routes").APMRouteHandlerResources, {
        [x: string]: {
            services: number;
            alerts: number;
        };
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/service-group/services": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/service-group/services", import("io-ts").TypeC<{
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").PartialC<{
            kuery: import("io-ts").StringC;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, {
        items: import("../service_groups/lookup_services").LookupServicesResponse;
    }, import("../typings").APMRouteCreateOptions>;
    "DELETE /internal/apm/service-group": import("@kbn/server-route-repository").ServerRoute<"DELETE /internal/apm/service-group", import("io-ts").TypeC<{
        query: import("io-ts").TypeC<{
            serviceGroupId: import("io-ts").StringC;
        }>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, void, import("../typings").APMRouteCreateOptions>;
    "POST /internal/apm/service-group": import("@kbn/server-route-repository").ServerRoute<"POST /internal/apm/service-group", import("io-ts").TypeC<{
        query: import("io-ts").UnionC<[import("io-ts").PartialC<{
            serviceGroupId: import("io-ts").StringC;
        }>, import("io-ts").UndefinedC]>;
        body: import("io-ts").TypeC<{
            groupName: import("io-ts").StringC;
            kuery: import("io-ts").StringC;
            description: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").UndefinedC]>;
            color: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").UndefinedC]>;
        }>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("@kbn/apm-types").SavedServiceGroup, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/service-group": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/service-group", import("io-ts").TypeC<{
        query: import("io-ts").TypeC<{
            serviceGroup: import("io-ts").StringC;
        }>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, {
        serviceGroup: import("@kbn/apm-types").SavedServiceGroup;
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/service-groups": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/service-groups", undefined, import("./register_apm_server_routes").APMRouteHandlerResources, {
        serviceGroups: import("@kbn/apm-types").SavedServiceGroup[];
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/slos": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/services/{serviceName}/slos", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            serviceName: import("io-ts").StringC;
        }>;
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            page: import("io-ts").Type<number, number, unknown>;
            perPage: import("io-ts").Type<number, number, unknown>;
        }>, import("io-ts").PartialC<{
            statusFilters: import("io-ts").Type<string[], string, unknown>;
            kqlQuery: import("io-ts").StringC;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("../services/get_service_slos").ServiceSlosResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/anomaly_score": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/services/{serviceName}/anomaly_score", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            serviceName: import("io-ts").StringC;
        }>;
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("../services/get_services/get_service_anomaly_score_for_service").ServiceAnomalyScoreResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/alerts_count": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/services/{serviceName}/alerts_count", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            serviceName: import("io-ts").StringC;
        }>;
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, {
        serviceName: string;
        alertsCount: number;
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/anomaly_charts": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/services/{serviceName}/anomaly_charts", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            serviceName: import("io-ts").StringC;
        }>;
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            transactionType: import("io-ts").StringC;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, {
        allAnomalyTimeseries: import("@kbn/apm-types").ServiceAnomalyTimeseries[];
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/dependencies/breakdown": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/services/{serviceName}/dependencies/breakdown", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            serviceName: import("io-ts").StringC;
        }>;
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, {
        breakdown: import("../services/get_service_dependencies_breakdown").ServiceDependenciesBreakdownResponse;
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/dependencies": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/services/{serviceName}/dependencies", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            serviceName: import("io-ts").StringC;
        }>;
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            numBuckets: import("io-ts").Type<number, number, unknown>;
        }>, import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").PartialC<{
            offset: import("io-ts").StringC;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, {
        serviceDependencies: import("../services/get_service_dependencies").ServiceDependenciesResponse;
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/service_overview_instances/detailed_statistics": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/services/{serviceName}/service_overview_instances/detailed_statistics", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            serviceName: import("io-ts").StringC;
        }>;
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            latencyAggregationType: import("io-ts").UnionC<[import("io-ts").LiteralC<import("@kbn/apm-types").LatencyAggregationType.avg>, import("io-ts").LiteralC<import("@kbn/apm-types").LatencyAggregationType.p95>, import("io-ts").LiteralC<import("@kbn/apm-types").LatencyAggregationType.p99>]>;
            transactionType: import("io-ts").StringC;
            serviceNodeIds: import("io-ts").Type<string[], string, unknown>;
            numBuckets: import("io-ts").Type<number, number, unknown>;
        }>, import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").PartialC<{
            offset: import("io-ts").StringC;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("../services/get_service_instances/detailed_statistics").ServiceInstancesDetailedStatisticsResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/service_overview_instances/main_statistics": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/services/{serviceName}/service_overview_instances/main_statistics", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            serviceName: import("io-ts").StringC;
        }>;
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            latencyAggregationType: import("io-ts").UnionC<[import("io-ts").LiteralC<import("@kbn/apm-types").LatencyAggregationType.avg>, import("io-ts").LiteralC<import("@kbn/apm-types").LatencyAggregationType.p95>, import("io-ts").LiteralC<import("@kbn/apm-types").LatencyAggregationType.p99>]>;
            transactionType: import("io-ts").StringC;
            sortField: import("io-ts").KeyofC<{
                serviceNodeName: null;
                latency: null;
                throughput: null;
                errorRate: null;
                cpuUsage: null;
                memoryUsage: null;
            }>;
            sortDirection: import("io-ts").UnionC<[import("io-ts").LiteralC<"asc">, import("io-ts").LiteralC<"desc">]>;
        }>, import("io-ts").PartialC<{
            offset: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, {
        currentPeriod: import("../services/get_service_instances/main_statistics").ServiceInstanceMainStatisticsResponse;
        previousPeriod: import("../services/get_service_instances/main_statistics").ServiceInstanceMainStatisticsResponse;
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/throughput": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/services/{serviceName}/throughput", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            serviceName: import("io-ts").StringC;
        }>;
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            bucketSizeInSeconds: import("io-ts").Type<number, number, unknown>;
        }>, import("io-ts").PartialC<{
            transactionType: import("io-ts").StringC;
            transactionName: import("io-ts").StringC;
            filters: import("io-ts").Type<import("@kbn/es-query").BoolQuery, string, unknown>;
        }>, import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").PartialC<{
            offset: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            documentType: import("io-ts").UnionC<[import("io-ts").LiteralC<import("../../../common/document_type").ApmDocumentType.ServiceTransactionMetric>, import("io-ts").LiteralC<import("../../../common/document_type").ApmDocumentType.TransactionMetric>, import("io-ts").LiteralC<import("../../../common/document_type").ApmDocumentType.TransactionEvent>]>;
            rollupInterval: import("io-ts").UnionC<[import("io-ts").LiteralC<import("../../../common/rollup").RollupInterval.OneMinute>, import("io-ts").LiteralC<import("../../../common/rollup").RollupInterval.TenMinutes>, import("io-ts").LiteralC<import("../../../common/rollup").RollupInterval.SixtyMinutes>, import("io-ts").LiteralC<import("../../../common/rollup").RollupInterval.None>]>;
        }>]>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, {
        currentPeriod: import("../services/get_throughput").ServiceThroughputResponse;
        previousPeriod: import("../services/get_throughput").ServiceThroughputResponse;
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/service_overview_instances/details/{serviceNodeName}": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/services/{serviceName}/service_overview_instances/details/{serviceNodeName}", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            serviceName: import("io-ts").StringC;
            serviceNodeName: import("io-ts").StringC;
        }>;
        query: import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("../services/get_service_instance_metadata_details").ServiceInstanceMetadataDetailsResponse | (import("../services/get_service_instance_metadata_details").ServiceInstanceMetadataDetailsResponse & {
        kubernetes: import("@kbn/apm-types").Kubernetes;
    }), import("../typings").APMRouteCreateOptions>;
    "POST /api/apm/services/{serviceName}/annotation 2023-10-31": import("@kbn/server-route-repository").ServerRoute<"POST /api/apm/services/{serviceName}/annotation 2023-10-31", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            serviceName: import("io-ts").StringC;
        }>;
        body: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            '@timestamp': import("io-ts").Type<number, string, unknown>;
            service: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                version: import("io-ts").StringC;
            }>, import("io-ts").PartialC<{
                environment: import("io-ts").StringC;
            }>]>;
        }>, import("io-ts").PartialC<{
            message: import("io-ts").StringC;
            tags: import("io-ts").ArrayC<import("io-ts").StringC>;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, {
        _id: string;
        _index: string;
        _source: import("../../../../observability/common/annotations").Annotation;
    }, import("../typings").APMRouteCreateOptions>;
    "GET /api/apm/services/{serviceName}/annotation/search 2023-10-31": import("@kbn/server-route-repository").ServerRoute<"GET /api/apm/services/{serviceName}/annotation/search 2023-10-31", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            serviceName: import("io-ts").StringC;
        }>;
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("../services/annotations").ServiceAnnotationResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/node/{serviceNodeName}/metadata": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/services/{serviceName}/node/{serviceNodeName}/metadata", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            serviceName: import("io-ts").StringC;
            serviceNodeName: import("io-ts").StringC;
        }>;
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            documentType: import("io-ts").UnionC<[import("io-ts").LiteralC<import("../../../common/document_type").ApmDocumentType.ServiceTransactionMetric>, import("io-ts").LiteralC<import("../../../common/document_type").ApmDocumentType.TransactionMetric>, import("io-ts").LiteralC<import("../../../common/document_type").ApmDocumentType.TransactionEvent>]>;
            rollupInterval: import("io-ts").UnionC<[import("io-ts").LiteralC<import("../../../common/rollup").RollupInterval.OneMinute>, import("io-ts").LiteralC<import("../../../common/rollup").RollupInterval.TenMinutes>, import("io-ts").LiteralC<import("../../../common/rollup").RollupInterval.SixtyMinutes>, import("io-ts").LiteralC<import("../../../common/rollup").RollupInterval.None>]>;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("../services/get_service_node_metadata").ServiceNodeMetadataResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/transaction_types": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/services/{serviceName}/transaction_types", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            serviceName: import("io-ts").StringC;
        }>;
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").TypeC<{
            documentType: import("io-ts").UnionC<[import("io-ts").LiteralC<import("../../../common/document_type").ApmDocumentType.ServiceTransactionMetric>, import("io-ts").LiteralC<import("../../../common/document_type").ApmDocumentType.TransactionMetric>, import("io-ts").LiteralC<import("../../../common/document_type").ApmDocumentType.TransactionEvent>]>;
            rollupInterval: import("io-ts").UnionC<[import("io-ts").LiteralC<import("../../../common/rollup").RollupInterval.OneMinute>, import("io-ts").LiteralC<import("../../../common/rollup").RollupInterval.TenMinutes>, import("io-ts").LiteralC<import("../../../common/rollup").RollupInterval.SixtyMinutes>, import("io-ts").LiteralC<import("../../../common/rollup").RollupInterval.None>]>;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("../services/get_service_transaction_types").ServiceTransactionTypesResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/metrics/mixed_ingestion": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/services/{serviceName}/metrics/mixed_ingestion", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            serviceName: import("io-ts").StringC;
        }>;
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("../services/get_service_mixed_ingestion").ServiceMixedIngestionResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/agent": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/services/{serviceName}/agent", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            serviceName: import("io-ts").StringC;
        }>;
        query: import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("../services/get_service_agent").ServiceAgentResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/metadata/icons": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/services/{serviceName}/metadata/icons", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            serviceName: import("io-ts").StringC;
        }>;
        query: import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("../services/get_service_metadata_icons").ServiceMetadataIcons, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/metadata/details": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/services/{serviceName}/metadata/details", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            serviceName: import("io-ts").StringC;
        }>;
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("../services/get_service_metadata_details").ServiceMetadataDetails, import("../typings").APMRouteCreateOptions>;
    "POST /internal/apm/services/detailed_statistics": import("@kbn/server-route-repository").ServerRoute<"POST /internal/apm/services/detailed_statistics", import("io-ts").TypeC<{
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").IntersectionC<[import("io-ts").PartialC<{
            offset: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            probability: import("io-ts").Type<number, number, unknown>;
        }>, import("io-ts").TypeC<{
            documentType: import("io-ts").UnionC<[import("io-ts").LiteralC<import("../../../common/document_type").ApmDocumentType.ServiceTransactionMetric>, import("io-ts").LiteralC<import("../../../common/document_type").ApmDocumentType.TransactionMetric>, import("io-ts").LiteralC<import("../../../common/document_type").ApmDocumentType.TransactionEvent>]>;
            rollupInterval: import("io-ts").UnionC<[import("io-ts").LiteralC<import("../../../common/rollup").RollupInterval.OneMinute>, import("io-ts").LiteralC<import("../../../common/rollup").RollupInterval.TenMinutes>, import("io-ts").LiteralC<import("../../../common/rollup").RollupInterval.SixtyMinutes>, import("io-ts").LiteralC<import("../../../common/rollup").RollupInterval.None>]>;
        }>]>, import("io-ts").TypeC<{
            bucketSizeInSeconds: import("io-ts").Type<number, number, unknown>;
        }>]>;
        body: import("io-ts").TypeC<{
            serviceNames: import("io-ts").Type<string[], string, unknown>;
        }>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("../services/get_services_detailed_statistics/get_service_transaction_detailed_statistics").ServiceTransactionDetailedStatPeriodsResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/services", import("io-ts").TypeC<{
        query: import("io-ts").IntersectionC<[import("io-ts").PartialC<{
            searchQuery: import("io-ts").StringC;
            serviceGroup: import("io-ts").StringC;
        }>, import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            probability: import("io-ts").Type<number, number, unknown>;
        }>, import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            documentType: import("io-ts").UnionC<[import("io-ts").LiteralC<import("../../../common/document_type").ApmDocumentType.ServiceTransactionMetric>, import("io-ts").LiteralC<import("../../../common/document_type").ApmDocumentType.TransactionMetric>, import("io-ts").LiteralC<import("../../../common/document_type").ApmDocumentType.TransactionEvent>]>;
            rollupInterval: import("io-ts").UnionC<[import("io-ts").LiteralC<import("../../../common/rollup").RollupInterval.OneMinute>, import("io-ts").LiteralC<import("../../../common/rollup").RollupInterval.TenMinutes>, import("io-ts").LiteralC<import("../../../common/rollup").RollupInterval.SixtyMinutes>, import("io-ts").LiteralC<import("../../../common/rollup").RollupInterval.None>]>;
        }>, import("io-ts").TypeC<{
            useDurationSummary: import("io-ts").Type<boolean, boolean, unknown>;
        }>]>, import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>]>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("../services/get_services/get_services_items").ServicesItemsResponse, import("../typings").APMRouteCreateOptions>;
    "POST /internal/apm/service-map/service_badges": import("@kbn/server-route-repository").ServerRoute<"POST /internal/apm/service-map/service_badges", import("io-ts").TypeC<{
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").PartialC<{
            kuery: import("io-ts").StringC;
        }>]>;
        body: import("io-ts").TypeC<{
            serviceNames: import("io-ts").Type<string[], string, unknown>;
        }>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("../service_map/get_service_map_service_badges").ServiceMapServiceBadgesResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/service-map/dependency": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/service-map/dependency", import("io-ts").TypeC<{
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            dependencies: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").ArrayC<import("io-ts").StringC>]>;
        }>, import("io-ts").PartialC<{
            sourceServiceName: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").PartialC<{
            offset: import("io-ts").StringC;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("../service_map/get_service_map_dependency_node_info").ServiceMapServiceDependencyInfoResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/service-map/service/{serviceName}": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/service-map/service/{serviceName}", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            serviceName: import("io-ts").StringC;
        }>;
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").PartialC<{
            offset: import("io-ts").StringC;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("../service_map/get_service_map_service_node_info").ServiceMapServiceNodeInfoResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/service-map": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/service-map", import("io-ts").TypeC<{
        query: import("io-ts").IntersectionC<[import("io-ts").PartialC<{
            serviceName: import("io-ts").StringC;
            serviceGroup: import("io-ts").StringC;
            kuery: import("io-ts").StringC;
            esQuery: import("io-ts").Type<any, string, unknown>;
        }>, import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("@kbn/apm-types").ServiceMapResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/observability_overview/has_data": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/observability_overview/has_data", undefined, import("./register_apm_server_routes").APMRouteHandlerResources, import("../observability_overview/has_data").HasDataResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/observability_overview": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/observability_overview", import("io-ts").TypeC<{
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").TypeC<{
            bucketSize: import("io-ts").Type<number, number, unknown>;
            intervalString: import("io-ts").StringC;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("../observability_overview/get_observability_overview_data").ObservabilityOverviewResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/metrics/serverless/active_instances": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/services/{serviceName}/metrics/serverless/active_instances", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            serviceName: import("io-ts").StringC;
        }>;
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").PartialC<{
            serverlessId: import("io-ts").StringC;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, {
        activeInstances: import("../metrics/serverless/get_active_instances_overview").ActiveInstanceOverview[];
        timeseries: import("@kbn/apm-types").Coordinate[];
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/metrics/serverless/functions_overview": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/services/{serviceName}/metrics/serverless/functions_overview", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            serviceName: import("io-ts").StringC;
        }>;
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, {
        serverlessFunctionsOverview: import("../metrics/serverless/get_serverless_functions_overview").ServerlessFunctionsOverviewResponse;
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/metrics/serverless/summary": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/services/{serviceName}/metrics/serverless/summary", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            serviceName: import("io-ts").StringC;
        }>;
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").PartialC<{
            serverlessId: import("io-ts").StringC;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("../metrics/serverless/get_serverless_summary").ServerlessSummaryResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/metrics/serverless/charts": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/services/{serviceName}/metrics/serverless/charts", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            serviceName: import("io-ts").StringC;
        }>;
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").PartialC<{
            serverlessId: import("io-ts").StringC;
        }>, import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            documentType: import("io-ts").UnionC<[import("io-ts").LiteralC<import("../../../common/document_type").ApmDocumentType.TransactionMetric>, import("io-ts").LiteralC<import("../../../common/document_type").ApmDocumentType.TransactionEvent>]>;
            rollupInterval: import("io-ts").UnionC<[import("io-ts").LiteralC<import("../../../common/rollup").RollupInterval.OneMinute>, import("io-ts").LiteralC<import("../../../common/rollup").RollupInterval.TenMinutes>, import("io-ts").LiteralC<import("../../../common/rollup").RollupInterval.SixtyMinutes>, import("io-ts").LiteralC<import("../../../common/rollup").RollupInterval.None>]>;
        }>, import("io-ts").TypeC<{
            bucketSizeInSeconds: import("io-ts").Type<number, number, unknown>;
        }>]>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, {
        charts: import("../metrics/fetch_and_transform_metrics").FetchAndTransformMetrics[];
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/metrics/nodes": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/services/{serviceName}/metrics/nodes", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            serviceName: import("io-ts").StringC;
        }>;
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, {
        serviceNodes: import("../metrics/get_service_nodes").ServiceNodesResponse;
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/metrics/charts": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/services/{serviceName}/metrics/charts", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            serviceName: import("io-ts").StringC;
        }>;
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            agentName: import("io-ts").StringC;
        }>, import("io-ts").PartialC<{
            serviceNodeName: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, {
        charts: import("../metrics/fetch_and_transform_metrics").FetchAndTransformMetrics[];
    }, import("../typings").APMRouteCreateOptions>;
    "POST /internal/apm/latency/overall_distribution/spans": import("@kbn/server-route-repository").ServerRoute<"POST /internal/apm/latency/overall_distribution/spans", import("io-ts").TypeC<{
        body: import("io-ts").IntersectionC<[import("io-ts").PartialC<{
            serviceName: import("io-ts").StringC;
            spanName: import("io-ts").StringC;
            transactionId: import("io-ts").StringC;
            termFilters: import("io-ts").ArrayC<import("io-ts").TypeC<{
                fieldName: import("io-ts").StringC;
                fieldValue: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").Type<number, number, unknown>]>;
            }>>;
            durationMin: import("io-ts").Type<number, number, unknown>;
            durationMax: import("io-ts").Type<number, number, unknown>;
            isOtel: import("io-ts").BooleanC;
        }>, import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").TypeC<{
            percentileThreshold: import("io-ts").Type<number, number, unknown>;
            chartType: import("io-ts").UnionC<[import("io-ts").LiteralC<import("../../../common/latency_distribution_chart_types").LatencyDistributionChartType.transactionLatency>, import("io-ts").LiteralC<import("../../../common/latency_distribution_chart_types").LatencyDistributionChartType.spanLatency>, import("io-ts").LiteralC<import("../../../common/latency_distribution_chart_types").LatencyDistributionChartType.latencyCorrelations>, import("io-ts").LiteralC<import("../../../common/latency_distribution_chart_types").LatencyDistributionChartType.failedTransactionsCorrelations>, import("io-ts").LiteralC<import("../../../common/latency_distribution_chart_types").LatencyDistributionChartType.dependencyLatency>]>;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("../latency_distribution/types").OverallLatencyDistributionResponse, import("../typings").APMRouteCreateOptions>;
    "POST /internal/apm/latency/overall_distribution/transactions": import("@kbn/server-route-repository").ServerRoute<"POST /internal/apm/latency/overall_distribution/transactions", import("io-ts").TypeC<{
        body: import("io-ts").IntersectionC<[import("io-ts").PartialC<{
            serviceName: import("io-ts").StringC;
            transactionName: import("io-ts").StringC;
            transactionType: import("io-ts").StringC;
            termFilters: import("io-ts").ArrayC<import("io-ts").TypeC<{
                fieldName: import("io-ts").StringC;
                fieldValue: import("io-ts").UnionC<[import("io-ts").StringC, import("io-ts").Type<number, number, unknown>]>;
            }>>;
            durationMin: import("io-ts").Type<number, number, unknown>;
            durationMax: import("io-ts").Type<number, number, unknown>;
        }>, import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").TypeC<{
            percentileThreshold: import("io-ts").Type<number, number, unknown>;
            chartType: import("io-ts").UnionC<[import("io-ts").LiteralC<import("../../../common/latency_distribution_chart_types").LatencyDistributionChartType.transactionLatency>, import("io-ts").LiteralC<import("../../../common/latency_distribution_chart_types").LatencyDistributionChartType.spanLatency>, import("io-ts").LiteralC<import("../../../common/latency_distribution_chart_types").LatencyDistributionChartType.latencyCorrelations>, import("io-ts").LiteralC<import("../../../common/latency_distribution_chart_types").LatencyDistributionChartType.failedTransactionsCorrelations>, import("io-ts").LiteralC<import("../../../common/latency_distribution_chart_types").LatencyDistributionChartType.dependencyLatency>]>;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("../latency_distribution/types").OverallLatencyDistributionResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/errors/{groupId}/top_erroneous_transactions": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/services/{serviceName}/errors/{groupId}/top_erroneous_transactions", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            serviceName: import("io-ts").StringC;
            groupId: import("io-ts").StringC;
        }>;
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").PartialC<{
            offset: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            numBuckets: import("io-ts").Type<number, number, unknown>;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("../errors/erroneous_transactions/get_top_erroneous_transactions").TopErroneousTransactionsResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/errors/distribution": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/services/{serviceName}/errors/distribution", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            serviceName: import("io-ts").StringC;
        }>;
        query: import("io-ts").IntersectionC<[import("io-ts").PartialC<{
            groupId: import("io-ts").StringC;
            transactionName: import("io-ts").StringC;
            bucketSizeInSeconds: import("io-ts").Type<number, number, unknown>;
        }>, import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").PartialC<{
            offset: import("io-ts").StringC;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("../errors/distribution/get_distribution").ErrorDistributionResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/errors/{groupId}/error/{errorId}": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/services/{serviceName}/errors/{groupId}/error/{errorId}", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            serviceName: import("io-ts").StringC;
            groupId: import("io-ts").StringC;
            errorId: import("io-ts").StringC;
        }>;
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("../errors/get_error_groups/get_error_sample_details").ErrorSampleDetailsResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/errors/{groupId}/samples": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/services/{serviceName}/errors/{groupId}/samples", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            serviceName: import("io-ts").StringC;
            groupId: import("io-ts").StringC;
        }>;
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("../errors/get_error_groups/get_error_group_sample_ids").ErrorGroupSampleIdsResponse, import("../typings").APMRouteCreateOptions>;
    "POST /internal/apm/services/{serviceName}/errors/groups/detailed_statistics": import("@kbn/server-route-repository").ServerRoute<"POST /internal/apm/services/{serviceName}/errors/groups/detailed_statistics", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            serviceName: import("io-ts").StringC;
        }>;
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>, import("io-ts").PartialC<{
            offset: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            numBuckets: import("io-ts").Type<number, number, unknown>;
        }>]>;
        body: import("io-ts").TypeC<{
            groupIds: import("io-ts").Type<string[], string, unknown>;
        }>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("../errors/get_error_groups/get_error_group_detailed_statistics").ErrorGroupPeriodsResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/errors/groups/main_statistics_by_transaction_name": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/services/{serviceName}/errors/groups/main_statistics_by_transaction_name", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            serviceName: import("io-ts").StringC;
        }>;
        query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            transactionType: import("io-ts").StringC;
            transactionName: import("io-ts").StringC;
            maxNumberOfErrorGroups: import("io-ts").Type<number, number, unknown>;
        }>, import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("../errors/get_error_groups/get_error_group_main_statistics").ErrorGroupMainStatisticsResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/services/{serviceName}/errors/groups/main_statistics": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/services/{serviceName}/errors/groups/main_statistics", import("io-ts").TypeC<{
        path: import("io-ts").TypeC<{
            serviceName: import("io-ts").StringC;
        }>;
        query: import("io-ts").IntersectionC<[import("io-ts").PartialC<{
            sortField: import("io-ts").StringC;
            sortDirection: import("io-ts").UnionC<[import("io-ts").LiteralC<"asc">, import("io-ts").LiteralC<"desc">]>;
            searchQuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
        }>, import("io-ts").TypeC<{
            kuery: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, import("../errors/get_error_groups/get_error_group_main_statistics").ErrorGroupMainStatisticsResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/environments": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/environments", import("io-ts").TypeC<{
        query: import("io-ts").IntersectionC<[import("io-ts").PartialC<{
            serviceName: import("io-ts").StringC;
        }>, import("io-ts").TypeC<{
            start: import("io-ts").Type<number, string, unknown>;
            end: import("io-ts").Type<number, string, unknown>;
        }>]>;
    }>, import("./register_apm_server_routes").APMRouteHandlerResources, {
        environments: import("@kbn/apm-types").Environment[];
    }, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/data_view/index_pattern": import("@kbn/server-route-repository").ServerRoute<"GET /internal/apm/data_view/index_pattern", undefined, import("./register_apm_server_routes").APMRouteHandlerResources, {
        apmDataViewIndexPattern: string;
        apmIndices: import("../../../../../../../platform/plugins/shared/apm_sources_access/server").APMIndices;
    }, import("../typings").APMRouteCreateOptions>;
    "POST /internal/apm/data_view/static": import("@kbn/server-route-repository").ServerRoute<"POST /internal/apm/data_view/static", undefined, import("./register_apm_server_routes").APMRouteHandlerResources, {
        created: boolean;
        dataView: import("@kbn/data-views-plugin/common").DataView;
    } | {
        created: boolean;
        reason?: string;
    }, import("../typings").APMRouteCreateOptions>;
};
declare const getGlobalApmServerRouteRepository: () => ServerRouteRepository;
export type APMServerRouteRepository = ReturnType<typeof getTypedGlobalApmServerRouteRepository>;
export type APIEndpoint = EndpointOf<APMServerRouteRepository>;
export { getGlobalApmServerRouteRepository };
