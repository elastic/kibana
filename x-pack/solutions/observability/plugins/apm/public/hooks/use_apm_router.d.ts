export declare function useApmRouter({ prependBasePath }?: {
    prependBasePath?: boolean;
}): import("@kbn/typed-react-router-config").Router<{
    '/link-to/transaction': {
        element: import("react").JSX.Element;
        params: import("io-ts").TypeC<{
            query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                transactionName: import("io-ts").StringC;
                serviceName: import("io-ts").StringC;
            }>, import("io-ts").PartialC<{
                rangeFrom: import("io-ts").StringC;
                rangeTo: import("io-ts").StringC;
            }>]>;
        }>;
    };
    '/link-to/transaction/{transactionId}': {
        element: import("react").JSX.Element;
        params: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            path: import("io-ts").TypeC<{
                transactionId: import("io-ts").StringC;
            }>;
        }>, import("io-ts").PartialC<{
            query: import("io-ts").PartialC<{
                rangeFrom: import("io-ts").StringC;
                rangeTo: import("io-ts").StringC;
                waterfallItemId: import("io-ts").StringC;
            }>;
        }>]>;
    };
    '/link-to/trace/{traceId}': {
        element: import("react").JSX.Element;
        params: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
            path: import("io-ts").TypeC<{
                traceId: import("io-ts").StringC;
            }>;
        }>, import("io-ts").PartialC<{
            query: import("io-ts").PartialC<{
                rangeFrom: import("io-ts").StringC;
                rangeTo: import("io-ts").StringC;
                waterfallItemId: import("io-ts").StringC;
            }>;
        }>]>;
    };
    '/': {
        element: import("react").JSX.Element;
        children: {
            '/': {
                element: import("react").JSX.Element;
                params: import("io-ts").TypeC<{
                    query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                        environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
                    }>, import("io-ts").TypeC<{
                        rangeFrom: import("io-ts").StringC;
                        rangeTo: import("io-ts").StringC;
                        kuery: import("io-ts").StringC;
                        comparisonEnabled: import("io-ts").Type<boolean, boolean, unknown>;
                    }>, import("io-ts").PartialC<{
                        refreshPaused: import("io-ts").UnionC<[import("io-ts").LiteralC<"true">, import("io-ts").LiteralC<"false">]>;
                        refreshInterval: import("io-ts").StringC;
                        page: import("io-ts").Type<number, number, unknown>;
                        pageSize: import("io-ts").Type<number, number, unknown>;
                        sortField: import("io-ts").StringC;
                        sortDirection: import("io-ts").UnionC<[import("io-ts").LiteralC<"asc">, import("io-ts").LiteralC<"desc">]>;
                    }>, import("io-ts").PartialC<{
                        offset: import("io-ts").StringC;
                    }>]>;
                }>;
                defaults: {
                    query: {
                        environment: "ENVIRONMENT_ALL";
                        kuery: string;
                    };
                };
                children: {
                    '/': {
                        element: import("react").JSX.Element;
                    };
                    '/storage-explorer': {
                        element: import("react").JSX.Element;
                        params: import("io-ts").TypeC<{
                            query: import("io-ts").TypeC<{
                                indexLifecyclePhase: import("io-ts").UnionC<[import("io-ts").LiteralC<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.All>, import("io-ts").LiteralC<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Hot>, import("io-ts").LiteralC<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Warm>, import("io-ts").LiteralC<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Cold>, import("io-ts").LiteralC<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Frozen>]>;
                            }>;
                        }>;
                        defaults: {
                            query: {
                                indexLifecyclePhase: import("@kbn/apm-types").IndexLifecyclePhaseSelectOption;
                            };
                        };
                    };
                    '/backends/inventory': {
                        element: import("react").JSX.Element;
                        params: import("io-ts").PartialC<{
                            query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                                comparisonEnabled: import("io-ts").Type<boolean, boolean, unknown>;
                            }>, import("io-ts").PartialC<{
                                offset: import("io-ts").StringC;
                            }>]>;
                        }>;
                    };
                    '/backends/{dependencyName}/overview': {
                        element: import("react").JSX.Element;
                        params: import("io-ts").TypeC<{
                            path: import("io-ts").TypeC<{
                                dependencyName: import("io-ts").StringC;
                            }>;
                        }>;
                    };
                    '/backends': {
                        element: import("react").JSX.Element;
                        params: import("io-ts").PartialC<{
                            query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                                comparisonEnabled: import("io-ts").Type<boolean, boolean, unknown>;
                                dependencyName: import("io-ts").StringC;
                            }>, import("io-ts").PartialC<{
                                offset: import("io-ts").StringC;
                            }>]>;
                        }>;
                        children: {
                            '/backends': {
                                element: import("react").JSX.Element;
                            };
                            '/backends/operations': {
                                element: import("react").JSX.Element;
                            };
                            '/backends/operation': {
                                params: import("io-ts").TypeC<{
                                    query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                                        spanName: import("io-ts").StringC;
                                    }>, import("io-ts").PartialC<{
                                        sampleRangeFrom: import("io-ts").Type<number, number, unknown>;
                                        sampleRangeTo: import("io-ts").Type<number, number, unknown>;
                                    }>]>;
                                }>;
                                element: import("react").JSX.Element;
                            };
                            '/backends/overview': {
                                element: import("react").JSX.Element;
                            };
                        };
                    };
                    '/dependencies': {
                        element: import("react").JSX.Element;
                        params: import("io-ts").PartialC<{
                            query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                                comparisonEnabled: import("io-ts").Type<boolean, boolean, unknown>;
                                dependencyName: import("io-ts").StringC;
                            }>, import("io-ts").PartialC<{
                                offset: import("io-ts").StringC;
                            }>]>;
                        }>;
                        children: {
                            '/dependencies': {
                                element: import("react").JSX.Element;
                            };
                            '/dependencies/operations': {
                                element: import("react").JSX.Element;
                            };
                            '/dependencies/operation': {
                                params: import("io-ts").TypeC<{
                                    query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                                        spanName: import("io-ts").StringC;
                                        detailTab: import("io-ts").UnionC<[import("io-ts").LiteralC<import("../components/app/transaction_details/waterfall_with_summary/transaction_tabs").TransactionTab.timeline>, import("io-ts").LiteralC<import("../components/app/transaction_details/waterfall_with_summary/transaction_tabs").TransactionTab.metadata>, import("io-ts").LiteralC<import("../components/app/transaction_details/waterfall_with_summary/transaction_tabs").TransactionTab.logs>]>;
                                        showCriticalPath: import("io-ts").Type<boolean, boolean, unknown>;
                                    }>, import("io-ts").PartialC<{
                                        spanId: import("io-ts").StringC;
                                        sampleRangeFrom: import("io-ts").Type<number, number, unknown>;
                                        sampleRangeTo: import("io-ts").Type<number, number, unknown>;
                                        waterfallItemId: import("io-ts").StringC;
                                        flyoutDetailTab: import("io-ts").StringC;
                                    }>]>;
                                }>;
                                defaults: {
                                    query: {
                                        detailTab: import("../components/app/transaction_details/waterfall_with_summary/transaction_tabs").TransactionTab;
                                        showCriticalPath: string;
                                    };
                                };
                                element: import("react").JSX.Element;
                            };
                            '/dependencies/overview': {
                                element: import("react").JSX.Element;
                            };
                        };
                    };
                    "/dependencies/inventory": {
                        element: React.ReactElement<any, any>;
                    } & {
                        params: import("io-ts").PartialC<{
                            query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                                comparisonEnabled: import("io-ts").Type<boolean, boolean, unknown>;
                            }>, import("io-ts").PartialC<{
                                offset: import("io-ts").StringC;
                            }>]>;
                        }>;
                    };
                    '/traces': {
                        element: import("react").JSX.Element;
                        children: {
                            '/traces': {
                                element: import("react").JSX.Element;
                            };
                        };
                    };
                    "/service-map": {
                        element: React.ReactElement<any, any>;
                        params: import("io-ts").TypeC<{
                            query: import("io-ts").TypeC<{
                                serviceGroup: import("io-ts").StringC;
                            }>;
                        }>;
                        defaults: {
                            query: {
                                serviceGroup: string;
                            };
                        };
                    };
                    "/services": {
                        element: React.ReactElement<any, any>;
                        params: import("io-ts").TypeC<{
                            query: import("io-ts").TypeC<{
                                serviceGroup: import("io-ts").StringC;
                            }>;
                        }>;
                        defaults: {
                            query: {
                                serviceGroup: string;
                            };
                        };
                    };
                };
            };
            '/mobile-services/{serviceName}': {
                element: import("react").JSX.Element;
                params: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                    path: import("io-ts").TypeC<{
                        serviceName: import("io-ts").StringC;
                    }>;
                }>, import("io-ts").TypeC<{
                    query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                        environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
                    }>, import("io-ts").TypeC<{
                        rangeFrom: import("io-ts").StringC;
                        rangeTo: import("io-ts").StringC;
                        kuery: import("io-ts").StringC;
                        serviceGroup: import("io-ts").StringC;
                        comparisonEnabled: import("io-ts").Type<boolean, boolean, unknown>;
                    }>, import("io-ts").PartialC<{
                        latencyAggregationType: import("io-ts").UnionC<[import("io-ts").LiteralC<import("@kbn/apm-types").LatencyAggregationType.avg>, import("io-ts").LiteralC<import("@kbn/apm-types").LatencyAggregationType.p95>, import("io-ts").LiteralC<import("@kbn/apm-types").LatencyAggregationType.p99>]>;
                        transactionType: import("io-ts").StringC;
                        refreshPaused: import("io-ts").UnionC<[import("io-ts").LiteralC<"true">, import("io-ts").LiteralC<"false">]>;
                        refreshInterval: import("io-ts").StringC;
                    }>, import("io-ts").PartialC<{
                        offset: import("io-ts").StringC;
                    }>]>;
                }>]>;
                defaults: {
                    query: {
                        kuery: string;
                        environment: "ENVIRONMENT_ALL";
                        serviceGroup: string;
                        latencyAggregationType: import("@kbn/apm-types").LatencyAggregationType;
                    };
                };
                children: {
                    '/mobile-services/{serviceName}/overview': {
                        params: import("io-ts").PartialC<{
                            query: import("io-ts").PartialC<{
                                page: import("io-ts").Type<number, number, unknown>;
                                pageSize: import("io-ts").Type<number, number, unknown>;
                                sortField: import("io-ts").StringC;
                                sortDirection: import("io-ts").UnionC<[import("io-ts").LiteralC<"asc">, import("io-ts").LiteralC<"desc">]>;
                                device: import("io-ts").StringC;
                                osVersion: import("io-ts").StringC;
                                appVersion: import("io-ts").StringC;
                                netConnectionType: import("io-ts").StringC;
                            }>;
                        }>;
                        element: React.ReactElement<any, any>;
                    };
                    '/mobile-services/{serviceName}/transactions': {
                        params: import("io-ts").PartialC<{
                            query: import("io-ts").PartialC<{
                                page: import("io-ts").Type<number, number, unknown>;
                                pageSize: import("io-ts").Type<number, number, unknown>;
                                sortField: import("io-ts").StringC;
                                sortDirection: import("io-ts").UnionC<[import("io-ts").LiteralC<"asc">, import("io-ts").LiteralC<"desc">]>;
                                device: import("io-ts").StringC;
                                osVersion: import("io-ts").StringC;
                                appVersion: import("io-ts").StringC;
                                netConnectionType: import("io-ts").StringC;
                                mobileSelectedTab: import("io-ts").StringC;
                            }>;
                        }>;
                        children: {
                            '/mobile-services/{serviceName}/transactions/view': {
                                element: import("react").JSX.Element;
                                params: import("io-ts").TypeC<{
                                    query: import("io-ts").IntersectionC<[import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                                        comparisonEnabled: import("io-ts").Type<boolean, boolean, unknown>;
                                        showCriticalPath: import("io-ts").Type<boolean, boolean, unknown>;
                                    }>, import("io-ts").PartialC<{
                                        transactionName: import("io-ts").StringC;
                                    }>]>, import("io-ts").PartialC<{
                                        traceId: import("io-ts").StringC;
                                        transactionId: import("io-ts").StringC;
                                        flyoutDetailTab: import("io-ts").StringC;
                                        sampleRangeTo: import("io-ts").Type<number, number, unknown>;
                                        sampleRangeFrom: import("io-ts").Type<number, number, unknown>;
                                    }>, import("io-ts").PartialC<{
                                        offset: import("io-ts").StringC;
                                    }>]>;
                                }>;
                                defaults: {
                                    query: {
                                        showCriticalPath: string;
                                    };
                                };
                            };
                            '/mobile-services/{serviceName}/transactions': {
                                element: import("react").JSX.Element;
                            };
                        };
                        element: React.ReactElement<any, any>;
                    };
                    '/mobile-services/{serviceName}/errors-and-crashes': {
                        params: import("io-ts").PartialC<{
                            query: import("io-ts").PartialC<{
                                page: import("io-ts").Type<number, number, unknown>;
                                pageSize: import("io-ts").Type<number, number, unknown>;
                                sortField: import("io-ts").StringC;
                                sortDirection: import("io-ts").UnionC<[import("io-ts").LiteralC<"asc">, import("io-ts").LiteralC<"desc">]>;
                                mobileErrorTabId: import("io-ts").StringC;
                                device: import("io-ts").StringC;
                                osVersion: import("io-ts").StringC;
                                appVersion: import("io-ts").StringC;
                                netConnectionType: import("io-ts").StringC;
                            }>;
                        }>;
                        children: {
                            '/mobile-services/{serviceName}/errors-and-crashes/errors/{groupId}': {
                                element: import("react").JSX.Element;
                                params: import("io-ts").TypeC<{
                                    path: import("io-ts").TypeC<{
                                        groupId: import("io-ts").StringC;
                                    }>;
                                    query: import("io-ts").PartialC<{
                                        errorId: import("io-ts").StringC;
                                    }>;
                                }>;
                            };
                            '/mobile-services/{serviceName}/errors-and-crashes/': {
                                element: import("react").JSX.Element;
                            };
                            '/mobile-services/{serviceName}/errors-and-crashes/crashes/{groupId}': {
                                element: import("react").JSX.Element;
                                params: import("io-ts").TypeC<{
                                    path: import("io-ts").TypeC<{
                                        groupId: import("io-ts").StringC;
                                    }>;
                                    query: import("io-ts").PartialC<{
                                        errorId: import("io-ts").StringC;
                                    }>;
                                }>;
                            };
                        };
                        element: React.ReactElement<any, any>;
                    };
                    '/mobile-services/{serviceName}/dependencies': {
                        element: React.ReactElement<any, any>;
                    };
                    '/mobile-services/{serviceName}/service-map': {
                        element: React.ReactElement<any, any>;
                    };
                    '/mobile-services/{serviceName}/logs': {
                        element: React.ReactElement<any, any>;
                    };
                    '/mobile-services/{serviceName}/alerts': {
                        params: import("io-ts").PartialC<{
                            query: import("io-ts").PartialC<{
                                alertStatus: import("io-ts").StringC;
                            }>;
                        }>;
                        element: React.ReactElement<any, any>;
                    };
                    '/mobile-services/{serviceName}/dashboards': {
                        params: import("io-ts").PartialC<{
                            query: import("io-ts").PartialC<{
                                dashboardId: import("io-ts").StringC;
                            }>;
                        }>;
                        element: React.ReactElement<any, any>;
                    };
                    '/mobile-services/{serviceName}/': {
                        element: import("react").JSX.Element;
                    };
                };
            };
            '/services/{serviceName}': {
                element: import("react").JSX.Element;
                params: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                    path: import("io-ts").TypeC<{
                        serviceName: import("io-ts").StringC;
                    }>;
                }>, import("io-ts").TypeC<{
                    query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                        environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
                    }>, import("io-ts").TypeC<{
                        rangeFrom: import("io-ts").StringC;
                        rangeTo: import("io-ts").StringC;
                        kuery: import("io-ts").StringC;
                        serviceGroup: import("io-ts").StringC;
                        comparisonEnabled: import("io-ts").Type<boolean, boolean, unknown>;
                    }>, import("io-ts").PartialC<{
                        latencyAggregationType: import("io-ts").UnionC<[import("io-ts").LiteralC<import("@kbn/apm-types").LatencyAggregationType.avg>, import("io-ts").LiteralC<import("@kbn/apm-types").LatencyAggregationType.p95>, import("io-ts").LiteralC<import("@kbn/apm-types").LatencyAggregationType.p99>]>;
                        transactionType: import("io-ts").StringC;
                        refreshPaused: import("io-ts").UnionC<[import("io-ts").LiteralC<"true">, import("io-ts").LiteralC<"false">]>;
                        refreshInterval: import("io-ts").StringC;
                    }>, import("io-ts").PartialC<{
                        offset: import("io-ts").StringC;
                    }>]>;
                }>]>;
                defaults: {
                    query: {
                        kuery: string;
                        environment: "ENVIRONMENT_ALL";
                        serviceGroup: string;
                        latencyAggregationType: import("@kbn/apm-types").LatencyAggregationType;
                    };
                };
                children: {
                    '/services/{serviceName}/overview': {
                        params: import("io-ts").PartialC<{
                            query: import("io-ts").PartialC<{
                                page: import("io-ts").Type<number, number, unknown>;
                                pageSize: import("io-ts").Type<number, number, unknown>;
                                sortField: import("io-ts").StringC;
                                sortDirection: import("io-ts").UnionC<[import("io-ts").LiteralC<"asc">, import("io-ts").LiteralC<"desc">]>;
                            }>;
                        }>;
                        element: React.ReactElement<any, any>;
                    };
                    '/services/{serviceName}/transactions': {
                        params: import("io-ts").PartialC<{
                            query: import("io-ts").PartialC<{
                                page: import("io-ts").Type<number, number, unknown>;
                                pageSize: import("io-ts").Type<number, number, unknown>;
                                sortField: import("io-ts").StringC;
                                sortDirection: import("io-ts").UnionC<[import("io-ts").LiteralC<"asc">, import("io-ts").LiteralC<"desc">]>;
                            }>;
                        }>;
                        children: {
                            '/services/{serviceName}/transactions/view': {
                                element: import("react").JSX.Element;
                                params: import("io-ts").TypeC<{
                                    query: import("io-ts").IntersectionC<[import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                                        comparisonEnabled: import("io-ts").Type<boolean, boolean, unknown>;
                                        showCriticalPath: import("io-ts").Type<boolean, boolean, unknown>;
                                    }>, import("io-ts").PartialC<{
                                        transactionName: import("io-ts").StringC;
                                    }>]>, import("io-ts").PartialC<{
                                        traceId: import("io-ts").StringC;
                                        transactionId: import("io-ts").StringC;
                                        flyoutDetailTab: import("io-ts").StringC;
                                        sampleRangeTo: import("io-ts").Type<number, number, unknown>;
                                        sampleRangeFrom: import("io-ts").Type<number, number, unknown>;
                                        page: import("io-ts").Type<number, number, unknown>;
                                        pageSize: import("io-ts").Type<number, number, unknown>;
                                        sortField: import("io-ts").StringC;
                                        sortDirection: import("io-ts").UnionC<[import("io-ts").LiteralC<"asc">, import("io-ts").LiteralC<"desc">]>;
                                    }>, import("io-ts").PartialC<{
                                        offset: import("io-ts").StringC;
                                    }>]>;
                                }>;
                                defaults: {
                                    query: {
                                        showCriticalPath: string;
                                    };
                                };
                            };
                            '/services/{serviceName}/transactions': {
                                element: import("react").JSX.Element;
                            };
                        };
                        element: React.ReactElement<any, any>;
                    };
                    '/services/{serviceName}/dependencies': {
                        element: React.ReactElement<any, any>;
                    };
                    '/services/{serviceName}/errors': {
                        params: import("io-ts").PartialC<{
                            query: import("io-ts").PartialC<{
                                page: import("io-ts").Type<number, number, unknown>;
                                pageSize: import("io-ts").Type<number, number, unknown>;
                                sortField: import("io-ts").StringC;
                                sortDirection: import("io-ts").UnionC<[import("io-ts").LiteralC<"asc">, import("io-ts").LiteralC<"desc">]>;
                            }>;
                        }>;
                        children: {
                            '/services/{serviceName}/errors/{groupId}': {
                                element: import("react").JSX.Element;
                                params: import("io-ts").TypeC<{
                                    path: import("io-ts").TypeC<{
                                        groupId: import("io-ts").StringC;
                                    }>;
                                    query: import("io-ts").PartialC<{
                                        errorId: import("io-ts").StringC;
                                    }>;
                                }>;
                            };
                            '/services/{serviceName}/errors': {
                                element: import("react").JSX.Element;
                            };
                        };
                        element: React.ReactElement<any, any>;
                    };
                    '/services/{serviceName}/metrics': {
                        children: {
                            '/services/{serviceName}/metrics': {
                                element: import("react").JSX.Element;
                            };
                            '/services/{serviceName}/metrics/{id}': {
                                element: import("react").JSX.Element;
                                params: import("io-ts").TypeC<{
                                    path: import("io-ts").TypeC<{
                                        id: import("io-ts").StringC;
                                    }>;
                                }>;
                            };
                        };
                        element: React.ReactElement<any, any>;
                    };
                    '/services/{serviceName}/nodes': {
                        children: {
                            '/services/{serviceName}/nodes/{serviceNodeName}/metrics': {
                                element: import("react").JSX.Element;
                                params: import("io-ts").TypeC<{
                                    path: import("io-ts").TypeC<{
                                        serviceNodeName: import("io-ts").StringC;
                                    }>;
                                }>;
                            };
                            '/services/{serviceName}/nodes': {
                                element: import("react").JSX.Element;
                                params: import("io-ts").PartialC<{
                                    query: import("io-ts").PartialC<{
                                        sortDirection: import("io-ts").StringC;
                                        sortField: import("io-ts").StringC;
                                        pageSize: import("io-ts").StringC;
                                        page: import("io-ts").StringC;
                                    }>;
                                }>;
                            };
                        };
                        element: React.ReactElement<any, any>;
                    };
                    '/services/{serviceName}/service-map': {
                        element: React.ReactElement<any, any>;
                    };
                    '/services/{serviceName}/logs': {
                        element: React.ReactElement<any, any>;
                    };
                    '/services/{serviceName}/infrastructure': {
                        params: import("io-ts").PartialC<{
                            query: import("io-ts").PartialC<{
                                detailTab: import("io-ts").UnionC<[import("io-ts").LiteralC<import("../components/app/infra_overview/infra_tabs/use_tabs").InfraTab.containers>, import("io-ts").LiteralC<import("../components/app/infra_overview/infra_tabs/use_tabs").InfraTab.pods>, import("io-ts").LiteralC<import("../components/app/infra_overview/infra_tabs/use_tabs").InfraTab.hosts>]>;
                            }>;
                        }>;
                        element: React.ReactElement<any, any>;
                    };
                    '/services/{serviceName}/alerts': {
                        params: import("io-ts").PartialC<{
                            query: import("io-ts").PartialC<{
                                alertStatus: import("io-ts").UnionC<[import("io-ts").LiteralC<"active">, import("io-ts").LiteralC<"recovered">, import("io-ts").LiteralC<"all">]>;
                            }>;
                        }>;
                        element: React.ReactElement<any, any>;
                    };
                    '/services/{serviceName}/profiling': {
                        element: React.ReactElement<any, any>;
                    };
                    '/services/{serviceName}/dashboards': {
                        params: import("io-ts").PartialC<{
                            query: import("io-ts").PartialC<{
                                dashboardId: import("io-ts").StringC;
                            }>;
                        }>;
                        element: React.ReactElement<any, any>;
                    };
                    '/services/{serviceName}/': {
                        element: import("react").JSX.Element;
                    };
                };
            };
            '/settings': {
                element: import("react").JSX.Element;
                children: {
                    '/settings/general-settings': {
                        element: React.ReactElement;
                    };
                    '/settings/agent-configuration': {
                        element: React.ReactElement;
                    };
                    '/settings/agent-configuration/create': {
                        params: import("io-ts").PartialC<{
                            query: import("io-ts").PartialC<{
                                pageStep: import("io-ts").UnionC<[import("io-ts").LiteralC<import("../../common/agent_configuration/constants").AgentConfigurationPageStep.ChooseService>, import("io-ts").LiteralC<import("../../common/agent_configuration/constants").AgentConfigurationPageStep.ChooseSettings>, import("io-ts").LiteralC<import("../../common/agent_configuration/constants").AgentConfigurationPageStep.Review>]>;
                            }>;
                        }>;
                        element: React.ReactElement;
                    };
                    '/settings/agent-configuration/edit': {
                        params: import("io-ts").PartialC<{
                            query: import("io-ts").PartialC<{
                                environment: import("io-ts").StringC;
                                name: import("io-ts").StringC;
                                pageStep: import("io-ts").UnionC<[import("io-ts").LiteralC<import("../../common/agent_configuration/constants").AgentConfigurationPageStep.ChooseService>, import("io-ts").LiteralC<import("../../common/agent_configuration/constants").AgentConfigurationPageStep.ChooseSettings>, import("io-ts").LiteralC<import("../../common/agent_configuration/constants").AgentConfigurationPageStep.Review>]>;
                            }>;
                        }>;
                        element: React.ReactElement;
                    };
                    '/settings/apm-indices': {
                        element: React.ReactElement;
                    };
                    '/settings/custom-links': {
                        element: React.ReactElement;
                    };
                    '/settings/schema': {
                        element: React.ReactElement;
                    };
                    '/settings/anomaly-detection': {
                        element: React.ReactElement;
                    };
                    '/settings/agent-keys': {
                        element: React.ReactElement;
                    };
                    '/settings/agent-explorer': {
                        params: import("io-ts").TypeC<{
                            query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                                environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
                            }>, import("io-ts").TypeC<{
                                kuery: import("io-ts").StringC;
                                agentLanguage: import("io-ts").StringC;
                                serviceName: import("io-ts").StringC;
                            }>]>;
                        }>;
                        element: React.ReactElement;
                    };
                    '/settings': {
                        element: import("react").JSX.Element;
                    };
                };
            };
            '/diagnostics': {
                element: import("react").JSX.Element;
                params: import("io-ts").TypeC<{
                    query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                        rangeFrom: import("io-ts").StringC;
                        rangeTo: import("io-ts").StringC;
                    }>, import("io-ts").PartialC<{
                        refreshPaused: import("io-ts").UnionC<[import("io-ts").LiteralC<"true">, import("io-ts").LiteralC<"false">]>;
                        refreshInterval: import("io-ts").StringC;
                        kuery: import("io-ts").StringC;
                    }>]>;
                }>;
                children: {
                    '/diagnostics': {
                        element: import("react").JSX.Element;
                        params: import("io-ts").TypeC<{
                            query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                                rangeFrom: import("io-ts").StringC;
                                rangeTo: import("io-ts").StringC;
                            }>, import("io-ts").PartialC<{
                                refreshPaused: import("io-ts").UnionC<[import("io-ts").LiteralC<"true">, import("io-ts").LiteralC<"false">]>;
                                refreshInterval: import("io-ts").StringC;
                                kuery: import("io-ts").StringC;
                            }>]>;
                        }>;
                    };
                    '/diagnostics/index-pattern-settings': {
                        element: import("react").JSX.Element;
                        params: import("io-ts").TypeC<{
                            query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                                rangeFrom: import("io-ts").StringC;
                                rangeTo: import("io-ts").StringC;
                            }>, import("io-ts").PartialC<{
                                refreshPaused: import("io-ts").UnionC<[import("io-ts").LiteralC<"true">, import("io-ts").LiteralC<"false">]>;
                                refreshInterval: import("io-ts").StringC;
                                kuery: import("io-ts").StringC;
                            }>]>;
                        }>;
                    };
                    '/diagnostics/index-templates': {
                        element: import("react").JSX.Element;
                        params: import("io-ts").TypeC<{
                            query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                                rangeFrom: import("io-ts").StringC;
                                rangeTo: import("io-ts").StringC;
                            }>, import("io-ts").PartialC<{
                                refreshPaused: import("io-ts").UnionC<[import("io-ts").LiteralC<"true">, import("io-ts").LiteralC<"false">]>;
                                refreshInterval: import("io-ts").StringC;
                                kuery: import("io-ts").StringC;
                            }>]>;
                        }>;
                    };
                    '/diagnostics/data-streams': {
                        element: import("react").JSX.Element;
                        params: import("io-ts").TypeC<{
                            query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                                rangeFrom: import("io-ts").StringC;
                                rangeTo: import("io-ts").StringC;
                            }>, import("io-ts").PartialC<{
                                refreshPaused: import("io-ts").UnionC<[import("io-ts").LiteralC<"true">, import("io-ts").LiteralC<"false">]>;
                                refreshInterval: import("io-ts").StringC;
                                kuery: import("io-ts").StringC;
                            }>]>;
                        }>;
                    };
                    '/diagnostics/indices': {
                        element: import("react").JSX.Element;
                        params: import("io-ts").TypeC<{
                            query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                                rangeFrom: import("io-ts").StringC;
                                rangeTo: import("io-ts").StringC;
                            }>, import("io-ts").PartialC<{
                                refreshPaused: import("io-ts").UnionC<[import("io-ts").LiteralC<"true">, import("io-ts").LiteralC<"false">]>;
                                refreshInterval: import("io-ts").StringC;
                                kuery: import("io-ts").StringC;
                            }>]>;
                        }>;
                    };
                    '/diagnostics/documents': {
                        element: import("react").JSX.Element;
                        params: import("io-ts").TypeC<{
                            query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                                rangeFrom: import("io-ts").StringC;
                                rangeTo: import("io-ts").StringC;
                            }>, import("io-ts").PartialC<{
                                refreshPaused: import("io-ts").UnionC<[import("io-ts").LiteralC<"true">, import("io-ts").LiteralC<"false">]>;
                                refreshInterval: import("io-ts").StringC;
                                kuery: import("io-ts").StringC;
                            }>]>;
                        }>;
                    };
                    '/diagnostics/import-export': {
                        element: import("react").JSX.Element;
                        params: import("io-ts").TypeC<{
                            query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                                rangeFrom: import("io-ts").StringC;
                                rangeTo: import("io-ts").StringC;
                            }>, import("io-ts").PartialC<{
                                refreshPaused: import("io-ts").UnionC<[import("io-ts").LiteralC<"true">, import("io-ts").LiteralC<"false">]>;
                                refreshInterval: import("io-ts").StringC;
                                kuery: import("io-ts").StringC;
                            }>]>;
                        }>;
                    };
                };
            };
            '/onboarding': {
                element: import("react").JSX.Element;
                params: import("io-ts").PartialC<{
                    query: import("io-ts").PartialC<{
                        agent: import("io-ts").UnionC<[import("io-ts").LiteralC<import("../components/app/onboarding/instruction_variants").INSTRUCTION_VARIANT.NODE>, import("io-ts").LiteralC<import("../components/app/onboarding/instruction_variants").INSTRUCTION_VARIANT.DJANGO>, import("io-ts").LiteralC<import("../components/app/onboarding/instruction_variants").INSTRUCTION_VARIANT.FLASK>, import("io-ts").LiteralC<import("../components/app/onboarding/instruction_variants").INSTRUCTION_VARIANT.RAILS>, import("io-ts").LiteralC<import("../components/app/onboarding/instruction_variants").INSTRUCTION_VARIANT.RACK>, import("io-ts").LiteralC<import("../components/app/onboarding/instruction_variants").INSTRUCTION_VARIANT.GO>, import("io-ts").LiteralC<import("../components/app/onboarding/instruction_variants").INSTRUCTION_VARIANT.JAVA>, import("io-ts").LiteralC<import("../components/app/onboarding/instruction_variants").INSTRUCTION_VARIANT.DOTNET>, import("io-ts").LiteralC<import("../components/app/onboarding/instruction_variants").INSTRUCTION_VARIANT.PHP>]>;
                    }>;
                }>;
            };
            '/tutorial': {
                element: import("react").JSX.Element;
            };
            '/service-groups': {
                element: import("react").JSX.Element;
                params: import("io-ts").TypeC<{
                    query: import("io-ts").IntersectionC<[import("io-ts").TypeC<{
                        environment: import("io-ts").UnionC<[import("io-ts").LiteralC<"ENVIRONMENT_NOT_DEFINED">, import("io-ts").LiteralC<"ENVIRONMENT_ALL">, import("io-ts").StringC, import("io-ts").BrandC<import("io-ts").StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
                    }>, import("io-ts").TypeC<{
                        rangeFrom: import("io-ts").StringC;
                        rangeTo: import("io-ts").StringC;
                        kuery: import("io-ts").StringC;
                        comparisonEnabled: import("io-ts").Type<boolean, boolean, unknown>;
                    }>, import("io-ts").TypeC<{
                        serviceGroup: import("io-ts").StringC;
                    }>, import("io-ts").PartialC<{
                        refreshPaused: import("io-ts").UnionC<[import("io-ts").LiteralC<"true">, import("io-ts").LiteralC<"false">]>;
                        refreshInterval: import("io-ts").StringC;
                    }>, import("io-ts").PartialC<{
                        offset: import("io-ts").StringC;
                    }>]>;
                }>;
                defaults: {
                    query: {
                        environment: "ENVIRONMENT_ALL";
                        kuery: string;
                        serviceGroup: string;
                    };
                };
            };
        };
    };
}>;
