import * as t from 'io-ts';
import React from 'react';
/**
 * The array of route definitions to be used when the application
 * creates the routes.
 */
declare const apmRoutes: {
    '/link-to/transaction': {
        element: React.JSX.Element;
        params: t.TypeC<{
            query: t.IntersectionC<[t.TypeC<{
                transactionName: t.StringC;
                serviceName: t.StringC;
            }>, t.PartialC<{
                rangeFrom: t.StringC;
                rangeTo: t.StringC;
            }>]>;
        }>;
    };
    '/link-to/transaction/{transactionId}': {
        element: React.JSX.Element;
        params: t.IntersectionC<[t.TypeC<{
            path: t.TypeC<{
                transactionId: t.StringC;
            }>;
        }>, t.PartialC<{
            query: t.PartialC<{
                rangeFrom: t.StringC;
                rangeTo: t.StringC;
                waterfallItemId: t.StringC;
            }>;
        }>]>;
    };
    '/link-to/trace/{traceId}': {
        element: React.JSX.Element;
        params: t.IntersectionC<[t.TypeC<{
            path: t.TypeC<{
                traceId: t.StringC;
            }>;
        }>, t.PartialC<{
            query: t.PartialC<{
                rangeFrom: t.StringC;
                rangeTo: t.StringC;
                waterfallItemId: t.StringC;
            }>;
        }>]>;
    };
    '/': {
        element: React.JSX.Element;
        children: {
            '/': {
                element: React.JSX.Element;
                params: t.TypeC<{
                    query: t.IntersectionC<[t.TypeC<{
                        environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
                    }>, t.TypeC<{
                        rangeFrom: t.StringC;
                        rangeTo: t.StringC;
                        kuery: t.StringC;
                        comparisonEnabled: t.Type<boolean, boolean, unknown>;
                    }>, t.PartialC<{
                        refreshPaused: t.UnionC<[t.LiteralC<"true">, t.LiteralC<"false">]>;
                        refreshInterval: t.StringC;
                        page: t.Type<number, number, unknown>;
                        pageSize: t.Type<number, number, unknown>;
                        sortField: t.StringC;
                        sortDirection: t.UnionC<[t.LiteralC<"asc">, t.LiteralC<"desc">]>;
                    }>, t.PartialC<{
                        offset: t.StringC;
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
                        element: React.JSX.Element;
                    };
                    '/storage-explorer': {
                        element: React.JSX.Element;
                        params: t.TypeC<{
                            query: t.TypeC<{
                                indexLifecyclePhase: t.UnionC<[t.LiteralC<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.All>, t.LiteralC<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Hot>, t.LiteralC<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Warm>, t.LiteralC<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Cold>, t.LiteralC<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Frozen>]>;
                            }>;
                        }>;
                        defaults: {
                            query: {
                                indexLifecyclePhase: import("@kbn/apm-types").IndexLifecyclePhaseSelectOption;
                            };
                        };
                    };
                    '/backends/inventory': {
                        element: React.JSX.Element;
                        params: t.PartialC<{
                            query: t.IntersectionC<[t.TypeC<{
                                comparisonEnabled: t.Type<boolean, boolean, unknown>;
                            }>, t.PartialC<{
                                offset: t.StringC;
                            }>]>;
                        }>;
                    };
                    '/backends/{dependencyName}/overview': {
                        element: React.JSX.Element;
                        params: t.TypeC<{
                            path: t.TypeC<{
                                dependencyName: t.StringC;
                            }>;
                        }>;
                    };
                    '/backends': {
                        element: React.JSX.Element;
                        params: t.PartialC<{
                            query: t.IntersectionC<[t.TypeC<{
                                comparisonEnabled: t.Type<boolean, boolean, unknown>;
                                dependencyName: t.StringC;
                            }>, t.PartialC<{
                                offset: t.StringC;
                            }>]>;
                        }>;
                        children: {
                            '/backends': {
                                element: React.JSX.Element;
                            };
                            '/backends/operations': {
                                element: React.JSX.Element;
                            };
                            '/backends/operation': {
                                params: t.TypeC<{
                                    query: t.IntersectionC<[t.TypeC<{
                                        spanName: t.StringC;
                                    }>, t.PartialC<{
                                        sampleRangeFrom: t.Type<number, number, unknown>;
                                        sampleRangeTo: t.Type<number, number, unknown>;
                                    }>]>;
                                }>;
                                element: React.JSX.Element;
                            };
                            '/backends/overview': {
                                element: React.JSX.Element;
                            };
                        };
                    };
                    '/dependencies': {
                        element: React.JSX.Element;
                        params: t.PartialC<{
                            query: t.IntersectionC<[t.TypeC<{
                                comparisonEnabled: t.Type<boolean, boolean, unknown>;
                                dependencyName: t.StringC;
                            }>, t.PartialC<{
                                offset: t.StringC;
                            }>]>;
                        }>;
                        children: {
                            '/dependencies': {
                                element: React.JSX.Element;
                            };
                            '/dependencies/operations': {
                                element: React.JSX.Element;
                            };
                            '/dependencies/operation': {
                                params: t.TypeC<{
                                    query: t.IntersectionC<[t.TypeC<{
                                        spanName: t.StringC;
                                        detailTab: t.UnionC<[t.LiteralC<import("../app/transaction_details/waterfall_with_summary/transaction_tabs").TransactionTab.timeline>, t.LiteralC<import("../app/transaction_details/waterfall_with_summary/transaction_tabs").TransactionTab.metadata>, t.LiteralC<import("../app/transaction_details/waterfall_with_summary/transaction_tabs").TransactionTab.logs>]>;
                                        showCriticalPath: t.Type<boolean, boolean, unknown>;
                                    }>, t.PartialC<{
                                        spanId: t.StringC;
                                        sampleRangeFrom: t.Type<number, number, unknown>;
                                        sampleRangeTo: t.Type<number, number, unknown>;
                                        waterfallItemId: t.StringC;
                                        flyoutDetailTab: t.StringC;
                                    }>]>;
                                }>;
                                defaults: {
                                    query: {
                                        detailTab: import("../app/transaction_details/waterfall_with_summary/transaction_tabs").TransactionTab;
                                        showCriticalPath: string;
                                    };
                                };
                                element: React.JSX.Element;
                            };
                            '/dependencies/overview': {
                                element: React.JSX.Element;
                            };
                        };
                    };
                    "/dependencies/inventory": {
                        element: React.ReactElement<any, any>;
                    } & {
                        params: t.PartialC<{
                            query: t.IntersectionC<[t.TypeC<{
                                comparisonEnabled: t.Type<boolean, boolean, unknown>;
                            }>, t.PartialC<{
                                offset: t.StringC;
                            }>]>;
                        }>;
                    };
                    '/traces': {
                        element: React.JSX.Element;
                        children: {
                            '/traces': {
                                element: React.JSX.Element;
                            };
                        };
                    };
                    "/service-map": {
                        element: React.ReactElement<any, any>;
                        params: t.TypeC<{
                            query: t.TypeC<{
                                serviceGroup: t.StringC;
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
                        params: t.TypeC<{
                            query: t.TypeC<{
                                serviceGroup: t.StringC;
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
                element: React.JSX.Element;
                params: t.IntersectionC<[t.TypeC<{
                    path: t.TypeC<{
                        serviceName: t.StringC;
                    }>;
                }>, t.TypeC<{
                    query: t.IntersectionC<[t.TypeC<{
                        environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
                    }>, t.TypeC<{
                        rangeFrom: t.StringC;
                        rangeTo: t.StringC;
                        kuery: t.StringC;
                        serviceGroup: t.StringC;
                        comparisonEnabled: t.Type<boolean, boolean, unknown>;
                    }>, t.PartialC<{
                        latencyAggregationType: t.UnionC<[t.LiteralC<import("@kbn/apm-types").LatencyAggregationType.avg>, t.LiteralC<import("@kbn/apm-types").LatencyAggregationType.p95>, t.LiteralC<import("@kbn/apm-types").LatencyAggregationType.p99>]>;
                        transactionType: t.StringC;
                        refreshPaused: t.UnionC<[t.LiteralC<"true">, t.LiteralC<"false">]>;
                        refreshInterval: t.StringC;
                    }>, t.PartialC<{
                        offset: t.StringC;
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
                        params: t.PartialC<{
                            query: t.PartialC<{
                                page: t.Type<number, number, unknown>;
                                pageSize: t.Type<number, number, unknown>;
                                sortField: t.StringC;
                                sortDirection: t.UnionC<[t.LiteralC<"asc">, t.LiteralC<"desc">]>;
                                device: t.StringC;
                                osVersion: t.StringC;
                                appVersion: t.StringC;
                                netConnectionType: t.StringC;
                            }>;
                        }>;
                        element: React.ReactElement<any, any>;
                    };
                    '/mobile-services/{serviceName}/transactions': {
                        params: t.PartialC<{
                            query: t.PartialC<{
                                page: t.Type<number, number, unknown>;
                                pageSize: t.Type<number, number, unknown>;
                                sortField: t.StringC;
                                sortDirection: t.UnionC<[t.LiteralC<"asc">, t.LiteralC<"desc">]>;
                                device: t.StringC;
                                osVersion: t.StringC;
                                appVersion: t.StringC;
                                netConnectionType: t.StringC;
                                mobileSelectedTab: t.StringC;
                            }>;
                        }>;
                        children: {
                            '/mobile-services/{serviceName}/transactions/view': {
                                element: React.JSX.Element;
                                params: t.TypeC<{
                                    query: t.IntersectionC<[t.IntersectionC<[t.TypeC<{
                                        comparisonEnabled: t.Type<boolean, boolean, unknown>;
                                        showCriticalPath: t.Type<boolean, boolean, unknown>;
                                    }>, t.PartialC<{
                                        transactionName: t.StringC;
                                    }>]>, t.PartialC<{
                                        traceId: t.StringC;
                                        transactionId: t.StringC;
                                        flyoutDetailTab: t.StringC;
                                        sampleRangeTo: t.Type<number, number, unknown>;
                                        sampleRangeFrom: t.Type<number, number, unknown>;
                                    }>, t.PartialC<{
                                        offset: t.StringC;
                                    }>]>;
                                }>;
                                defaults: {
                                    query: {
                                        showCriticalPath: string;
                                    };
                                };
                            };
                            '/mobile-services/{serviceName}/transactions': {
                                element: React.JSX.Element;
                            };
                        };
                        element: React.ReactElement<any, any>;
                    };
                    '/mobile-services/{serviceName}/errors-and-crashes': {
                        params: t.PartialC<{
                            query: t.PartialC<{
                                page: t.Type<number, number, unknown>;
                                pageSize: t.Type<number, number, unknown>;
                                sortField: t.StringC;
                                sortDirection: t.UnionC<[t.LiteralC<"asc">, t.LiteralC<"desc">]>;
                                mobileErrorTabId: t.StringC;
                                device: t.StringC;
                                osVersion: t.StringC;
                                appVersion: t.StringC;
                                netConnectionType: t.StringC;
                            }>;
                        }>;
                        children: {
                            '/mobile-services/{serviceName}/errors-and-crashes/errors/{groupId}': {
                                element: React.JSX.Element;
                                params: t.TypeC<{
                                    path: t.TypeC<{
                                        groupId: t.StringC;
                                    }>;
                                    query: t.PartialC<{
                                        errorId: t.StringC;
                                    }>;
                                }>;
                            };
                            '/mobile-services/{serviceName}/errors-and-crashes/': {
                                element: React.JSX.Element;
                            };
                            '/mobile-services/{serviceName}/errors-and-crashes/crashes/{groupId}': {
                                element: React.JSX.Element;
                                params: t.TypeC<{
                                    path: t.TypeC<{
                                        groupId: t.StringC;
                                    }>;
                                    query: t.PartialC<{
                                        errorId: t.StringC;
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
                        params: t.PartialC<{
                            query: t.PartialC<{
                                alertStatus: t.StringC;
                            }>;
                        }>;
                        element: React.ReactElement<any, any>;
                    };
                    '/mobile-services/{serviceName}/dashboards': {
                        params: t.PartialC<{
                            query: t.PartialC<{
                                dashboardId: t.StringC;
                            }>;
                        }>;
                        element: React.ReactElement<any, any>;
                    };
                    '/mobile-services/{serviceName}/': {
                        element: React.JSX.Element;
                    };
                };
            };
            '/services/{serviceName}': {
                element: React.JSX.Element;
                params: t.IntersectionC<[t.TypeC<{
                    path: t.TypeC<{
                        serviceName: t.StringC;
                    }>;
                }>, t.TypeC<{
                    query: t.IntersectionC<[t.TypeC<{
                        environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
                    }>, t.TypeC<{
                        rangeFrom: t.StringC;
                        rangeTo: t.StringC;
                        kuery: t.StringC;
                        serviceGroup: t.StringC;
                        comparisonEnabled: t.Type<boolean, boolean, unknown>;
                    }>, t.PartialC<{
                        latencyAggregationType: t.UnionC<[t.LiteralC<import("@kbn/apm-types").LatencyAggregationType.avg>, t.LiteralC<import("@kbn/apm-types").LatencyAggregationType.p95>, t.LiteralC<import("@kbn/apm-types").LatencyAggregationType.p99>]>;
                        transactionType: t.StringC;
                        refreshPaused: t.UnionC<[t.LiteralC<"true">, t.LiteralC<"false">]>;
                        refreshInterval: t.StringC;
                    }>, t.PartialC<{
                        offset: t.StringC;
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
                        params: t.PartialC<{
                            query: t.PartialC<{
                                page: t.Type<number, number, unknown>;
                                pageSize: t.Type<number, number, unknown>;
                                sortField: t.StringC;
                                sortDirection: t.UnionC<[t.LiteralC<"asc">, t.LiteralC<"desc">]>;
                            }>;
                        }>;
                        element: React.ReactElement<any, any>;
                    };
                    '/services/{serviceName}/transactions': {
                        params: t.PartialC<{
                            query: t.PartialC<{
                                page: t.Type<number, number, unknown>;
                                pageSize: t.Type<number, number, unknown>;
                                sortField: t.StringC;
                                sortDirection: t.UnionC<[t.LiteralC<"asc">, t.LiteralC<"desc">]>;
                            }>;
                        }>;
                        children: {
                            '/services/{serviceName}/transactions/view': {
                                element: React.JSX.Element;
                                params: t.TypeC<{
                                    query: t.IntersectionC<[t.IntersectionC<[t.TypeC<{
                                        comparisonEnabled: t.Type<boolean, boolean, unknown>;
                                        showCriticalPath: t.Type<boolean, boolean, unknown>;
                                    }>, t.PartialC<{
                                        transactionName: t.StringC;
                                    }>]>, t.PartialC<{
                                        traceId: t.StringC;
                                        transactionId: t.StringC;
                                        flyoutDetailTab: t.StringC;
                                        sampleRangeTo: t.Type<number, number, unknown>;
                                        sampleRangeFrom: t.Type<number, number, unknown>;
                                        page: t.Type<number, number, unknown>;
                                        pageSize: t.Type<number, number, unknown>;
                                        sortField: t.StringC;
                                        sortDirection: t.UnionC<[t.LiteralC<"asc">, t.LiteralC<"desc">]>;
                                    }>, t.PartialC<{
                                        offset: t.StringC;
                                    }>]>;
                                }>;
                                defaults: {
                                    query: {
                                        showCriticalPath: string;
                                    };
                                };
                            };
                            '/services/{serviceName}/transactions': {
                                element: React.JSX.Element;
                            };
                        };
                        element: React.ReactElement<any, any>;
                    };
                    '/services/{serviceName}/dependencies': {
                        element: React.ReactElement<any, any>;
                    };
                    '/services/{serviceName}/errors': {
                        params: t.PartialC<{
                            query: t.PartialC<{
                                page: t.Type<number, number, unknown>;
                                pageSize: t.Type<number, number, unknown>;
                                sortField: t.StringC;
                                sortDirection: t.UnionC<[t.LiteralC<"asc">, t.LiteralC<"desc">]>;
                            }>;
                        }>;
                        children: {
                            '/services/{serviceName}/errors/{groupId}': {
                                element: React.JSX.Element;
                                params: t.TypeC<{
                                    path: t.TypeC<{
                                        groupId: t.StringC;
                                    }>;
                                    query: t.PartialC<{
                                        errorId: t.StringC;
                                    }>;
                                }>;
                            };
                            '/services/{serviceName}/errors': {
                                element: React.JSX.Element;
                            };
                        };
                        element: React.ReactElement<any, any>;
                    };
                    '/services/{serviceName}/metrics': {
                        children: {
                            '/services/{serviceName}/metrics': {
                                element: React.JSX.Element;
                            };
                            '/services/{serviceName}/metrics/{id}': {
                                element: React.JSX.Element;
                                params: t.TypeC<{
                                    path: t.TypeC<{
                                        id: t.StringC;
                                    }>;
                                }>;
                            };
                        };
                        element: React.ReactElement<any, any>;
                    };
                    '/services/{serviceName}/nodes': {
                        children: {
                            '/services/{serviceName}/nodes/{serviceNodeName}/metrics': {
                                element: React.JSX.Element;
                                params: t.TypeC<{
                                    path: t.TypeC<{
                                        serviceNodeName: t.StringC;
                                    }>;
                                }>;
                            };
                            '/services/{serviceName}/nodes': {
                                element: React.JSX.Element;
                                params: t.PartialC<{
                                    query: t.PartialC<{
                                        sortDirection: t.StringC;
                                        sortField: t.StringC;
                                        pageSize: t.StringC;
                                        page: t.StringC;
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
                        params: t.PartialC<{
                            query: t.PartialC<{
                                detailTab: t.UnionC<[t.LiteralC<import("../app/infra_overview/infra_tabs/use_tabs").InfraTab.containers>, t.LiteralC<import("../app/infra_overview/infra_tabs/use_tabs").InfraTab.pods>, t.LiteralC<import("../app/infra_overview/infra_tabs/use_tabs").InfraTab.hosts>]>;
                            }>;
                        }>;
                        element: React.ReactElement<any, any>;
                    };
                    '/services/{serviceName}/alerts': {
                        params: t.PartialC<{
                            query: t.PartialC<{
                                alertStatus: t.UnionC<[t.LiteralC<"active">, t.LiteralC<"recovered">, t.LiteralC<"all">]>;
                            }>;
                        }>;
                        element: React.ReactElement<any, any>;
                    };
                    '/services/{serviceName}/profiling': {
                        element: React.ReactElement<any, any>;
                    };
                    '/services/{serviceName}/dashboards': {
                        params: t.PartialC<{
                            query: t.PartialC<{
                                dashboardId: t.StringC;
                            }>;
                        }>;
                        element: React.ReactElement<any, any>;
                    };
                    '/services/{serviceName}/': {
                        element: React.JSX.Element;
                    };
                };
            };
            '/settings': {
                element: React.JSX.Element;
                children: {
                    '/settings/general-settings': {
                        element: React.ReactElement;
                    };
                    '/settings/agent-configuration': {
                        element: React.ReactElement;
                    };
                    '/settings/agent-configuration/create': {
                        params: t.PartialC<{
                            query: t.PartialC<{
                                pageStep: t.UnionC<[t.LiteralC<import("../../../common/agent_configuration/constants").AgentConfigurationPageStep.ChooseService>, t.LiteralC<import("../../../common/agent_configuration/constants").AgentConfigurationPageStep.ChooseSettings>, t.LiteralC<import("../../../common/agent_configuration/constants").AgentConfigurationPageStep.Review>]>;
                            }>;
                        }>;
                        element: React.ReactElement;
                    };
                    '/settings/agent-configuration/edit': {
                        params: t.PartialC<{
                            query: t.PartialC<{
                                environment: t.StringC;
                                name: t.StringC;
                                pageStep: t.UnionC<[t.LiteralC<import("../../../common/agent_configuration/constants").AgentConfigurationPageStep.ChooseService>, t.LiteralC<import("../../../common/agent_configuration/constants").AgentConfigurationPageStep.ChooseSettings>, t.LiteralC<import("../../../common/agent_configuration/constants").AgentConfigurationPageStep.Review>]>;
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
                        params: t.TypeC<{
                            query: t.IntersectionC<[t.TypeC<{
                                environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
                            }>, t.TypeC<{
                                kuery: t.StringC;
                                agentLanguage: t.StringC;
                                serviceName: t.StringC;
                            }>]>;
                        }>;
                        element: React.ReactElement;
                    };
                    '/settings': {
                        element: React.JSX.Element;
                    };
                };
            };
            '/diagnostics': {
                element: React.JSX.Element;
                params: t.TypeC<{
                    query: t.IntersectionC<[t.TypeC<{
                        rangeFrom: t.StringC;
                        rangeTo: t.StringC;
                    }>, t.PartialC<{
                        refreshPaused: t.UnionC<[t.LiteralC<"true">, t.LiteralC<"false">]>;
                        refreshInterval: t.StringC;
                        kuery: t.StringC;
                    }>]>;
                }>;
                children: {
                    '/diagnostics': {
                        element: React.JSX.Element;
                        params: t.TypeC<{
                            query: t.IntersectionC<[t.TypeC<{
                                rangeFrom: t.StringC;
                                rangeTo: t.StringC;
                            }>, t.PartialC<{
                                refreshPaused: t.UnionC<[t.LiteralC<"true">, t.LiteralC<"false">]>;
                                refreshInterval: t.StringC;
                                kuery: t.StringC;
                            }>]>;
                        }>;
                    };
                    '/diagnostics/index-pattern-settings': {
                        element: React.JSX.Element;
                        params: t.TypeC<{
                            query: t.IntersectionC<[t.TypeC<{
                                rangeFrom: t.StringC;
                                rangeTo: t.StringC;
                            }>, t.PartialC<{
                                refreshPaused: t.UnionC<[t.LiteralC<"true">, t.LiteralC<"false">]>;
                                refreshInterval: t.StringC;
                                kuery: t.StringC;
                            }>]>;
                        }>;
                    };
                    '/diagnostics/index-templates': {
                        element: React.JSX.Element;
                        params: t.TypeC<{
                            query: t.IntersectionC<[t.TypeC<{
                                rangeFrom: t.StringC;
                                rangeTo: t.StringC;
                            }>, t.PartialC<{
                                refreshPaused: t.UnionC<[t.LiteralC<"true">, t.LiteralC<"false">]>;
                                refreshInterval: t.StringC;
                                kuery: t.StringC;
                            }>]>;
                        }>;
                    };
                    '/diagnostics/data-streams': {
                        element: React.JSX.Element;
                        params: t.TypeC<{
                            query: t.IntersectionC<[t.TypeC<{
                                rangeFrom: t.StringC;
                                rangeTo: t.StringC;
                            }>, t.PartialC<{
                                refreshPaused: t.UnionC<[t.LiteralC<"true">, t.LiteralC<"false">]>;
                                refreshInterval: t.StringC;
                                kuery: t.StringC;
                            }>]>;
                        }>;
                    };
                    '/diagnostics/indices': {
                        element: React.JSX.Element;
                        params: t.TypeC<{
                            query: t.IntersectionC<[t.TypeC<{
                                rangeFrom: t.StringC;
                                rangeTo: t.StringC;
                            }>, t.PartialC<{
                                refreshPaused: t.UnionC<[t.LiteralC<"true">, t.LiteralC<"false">]>;
                                refreshInterval: t.StringC;
                                kuery: t.StringC;
                            }>]>;
                        }>;
                    };
                    '/diagnostics/documents': {
                        element: React.JSX.Element;
                        params: t.TypeC<{
                            query: t.IntersectionC<[t.TypeC<{
                                rangeFrom: t.StringC;
                                rangeTo: t.StringC;
                            }>, t.PartialC<{
                                refreshPaused: t.UnionC<[t.LiteralC<"true">, t.LiteralC<"false">]>;
                                refreshInterval: t.StringC;
                                kuery: t.StringC;
                            }>]>;
                        }>;
                    };
                    '/diagnostics/import-export': {
                        element: React.JSX.Element;
                        params: t.TypeC<{
                            query: t.IntersectionC<[t.TypeC<{
                                rangeFrom: t.StringC;
                                rangeTo: t.StringC;
                            }>, t.PartialC<{
                                refreshPaused: t.UnionC<[t.LiteralC<"true">, t.LiteralC<"false">]>;
                                refreshInterval: t.StringC;
                                kuery: t.StringC;
                            }>]>;
                        }>;
                    };
                };
            };
            '/onboarding': {
                element: React.JSX.Element;
                params: t.PartialC<{
                    query: t.PartialC<{
                        agent: t.UnionC<[t.LiteralC<import("../app/onboarding/instruction_variants").INSTRUCTION_VARIANT.NODE>, t.LiteralC<import("../app/onboarding/instruction_variants").INSTRUCTION_VARIANT.DJANGO>, t.LiteralC<import("../app/onboarding/instruction_variants").INSTRUCTION_VARIANT.FLASK>, t.LiteralC<import("../app/onboarding/instruction_variants").INSTRUCTION_VARIANT.RAILS>, t.LiteralC<import("../app/onboarding/instruction_variants").INSTRUCTION_VARIANT.RACK>, t.LiteralC<import("../app/onboarding/instruction_variants").INSTRUCTION_VARIANT.GO>, t.LiteralC<import("../app/onboarding/instruction_variants").INSTRUCTION_VARIANT.JAVA>, t.LiteralC<import("../app/onboarding/instruction_variants").INSTRUCTION_VARIANT.DOTNET>, t.LiteralC<import("../app/onboarding/instruction_variants").INSTRUCTION_VARIANT.PHP>]>;
                    }>;
                }>;
            };
            '/tutorial': {
                element: React.JSX.Element;
            };
            '/service-groups': {
                element: React.JSX.Element;
                params: t.TypeC<{
                    query: t.IntersectionC<[t.TypeC<{
                        environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
                    }>, t.TypeC<{
                        rangeFrom: t.StringC;
                        rangeTo: t.StringC;
                        kuery: t.StringC;
                        comparisonEnabled: t.Type<boolean, boolean, unknown>;
                    }>, t.TypeC<{
                        serviceGroup: t.StringC;
                    }>, t.PartialC<{
                        refreshPaused: t.UnionC<[t.LiteralC<"true">, t.LiteralC<"false">]>;
                        refreshInterval: t.StringC;
                    }>, t.PartialC<{
                        offset: t.StringC;
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
};
export type ApmRoutes = typeof apmRoutes;
export declare const apmRouter: import("@kbn/typed-react-router-config").Router<{
    '/link-to/transaction': {
        element: React.JSX.Element;
        params: t.TypeC<{
            query: t.IntersectionC<[t.TypeC<{
                transactionName: t.StringC;
                serviceName: t.StringC;
            }>, t.PartialC<{
                rangeFrom: t.StringC;
                rangeTo: t.StringC;
            }>]>;
        }>;
    };
    '/link-to/transaction/{transactionId}': {
        element: React.JSX.Element;
        params: t.IntersectionC<[t.TypeC<{
            path: t.TypeC<{
                transactionId: t.StringC;
            }>;
        }>, t.PartialC<{
            query: t.PartialC<{
                rangeFrom: t.StringC;
                rangeTo: t.StringC;
                waterfallItemId: t.StringC;
            }>;
        }>]>;
    };
    '/link-to/trace/{traceId}': {
        element: React.JSX.Element;
        params: t.IntersectionC<[t.TypeC<{
            path: t.TypeC<{
                traceId: t.StringC;
            }>;
        }>, t.PartialC<{
            query: t.PartialC<{
                rangeFrom: t.StringC;
                rangeTo: t.StringC;
                waterfallItemId: t.StringC;
            }>;
        }>]>;
    };
    '/': {
        element: React.JSX.Element;
        children: {
            '/': {
                element: React.JSX.Element;
                params: t.TypeC<{
                    query: t.IntersectionC<[t.TypeC<{
                        environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
                    }>, t.TypeC<{
                        rangeFrom: t.StringC;
                        rangeTo: t.StringC;
                        kuery: t.StringC;
                        comparisonEnabled: t.Type<boolean, boolean, unknown>;
                    }>, t.PartialC<{
                        refreshPaused: t.UnionC<[t.LiteralC<"true">, t.LiteralC<"false">]>;
                        refreshInterval: t.StringC;
                        page: t.Type<number, number, unknown>;
                        pageSize: t.Type<number, number, unknown>;
                        sortField: t.StringC;
                        sortDirection: t.UnionC<[t.LiteralC<"asc">, t.LiteralC<"desc">]>;
                    }>, t.PartialC<{
                        offset: t.StringC;
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
                        element: React.JSX.Element;
                    };
                    '/storage-explorer': {
                        element: React.JSX.Element;
                        params: t.TypeC<{
                            query: t.TypeC<{
                                indexLifecyclePhase: t.UnionC<[t.LiteralC<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.All>, t.LiteralC<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Hot>, t.LiteralC<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Warm>, t.LiteralC<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Cold>, t.LiteralC<import("@kbn/apm-types").IndexLifecyclePhaseSelectOption.Frozen>]>;
                            }>;
                        }>;
                        defaults: {
                            query: {
                                indexLifecyclePhase: import("@kbn/apm-types").IndexLifecyclePhaseSelectOption;
                            };
                        };
                    };
                    '/backends/inventory': {
                        element: React.JSX.Element;
                        params: t.PartialC<{
                            query: t.IntersectionC<[t.TypeC<{
                                comparisonEnabled: t.Type<boolean, boolean, unknown>;
                            }>, t.PartialC<{
                                offset: t.StringC;
                            }>]>;
                        }>;
                    };
                    '/backends/{dependencyName}/overview': {
                        element: React.JSX.Element;
                        params: t.TypeC<{
                            path: t.TypeC<{
                                dependencyName: t.StringC;
                            }>;
                        }>;
                    };
                    '/backends': {
                        element: React.JSX.Element;
                        params: t.PartialC<{
                            query: t.IntersectionC<[t.TypeC<{
                                comparisonEnabled: t.Type<boolean, boolean, unknown>;
                                dependencyName: t.StringC;
                            }>, t.PartialC<{
                                offset: t.StringC;
                            }>]>;
                        }>;
                        children: {
                            '/backends': {
                                element: React.JSX.Element;
                            };
                            '/backends/operations': {
                                element: React.JSX.Element;
                            };
                            '/backends/operation': {
                                params: t.TypeC<{
                                    query: t.IntersectionC<[t.TypeC<{
                                        spanName: t.StringC;
                                    }>, t.PartialC<{
                                        sampleRangeFrom: t.Type<number, number, unknown>;
                                        sampleRangeTo: t.Type<number, number, unknown>;
                                    }>]>;
                                }>;
                                element: React.JSX.Element;
                            };
                            '/backends/overview': {
                                element: React.JSX.Element;
                            };
                        };
                    };
                    '/dependencies': {
                        element: React.JSX.Element;
                        params: t.PartialC<{
                            query: t.IntersectionC<[t.TypeC<{
                                comparisonEnabled: t.Type<boolean, boolean, unknown>;
                                dependencyName: t.StringC;
                            }>, t.PartialC<{
                                offset: t.StringC;
                            }>]>;
                        }>;
                        children: {
                            '/dependencies': {
                                element: React.JSX.Element;
                            };
                            '/dependencies/operations': {
                                element: React.JSX.Element;
                            };
                            '/dependencies/operation': {
                                params: t.TypeC<{
                                    query: t.IntersectionC<[t.TypeC<{
                                        spanName: t.StringC;
                                        detailTab: t.UnionC<[t.LiteralC<import("../app/transaction_details/waterfall_with_summary/transaction_tabs").TransactionTab.timeline>, t.LiteralC<import("../app/transaction_details/waterfall_with_summary/transaction_tabs").TransactionTab.metadata>, t.LiteralC<import("../app/transaction_details/waterfall_with_summary/transaction_tabs").TransactionTab.logs>]>;
                                        showCriticalPath: t.Type<boolean, boolean, unknown>;
                                    }>, t.PartialC<{
                                        spanId: t.StringC;
                                        sampleRangeFrom: t.Type<number, number, unknown>;
                                        sampleRangeTo: t.Type<number, number, unknown>;
                                        waterfallItemId: t.StringC;
                                        flyoutDetailTab: t.StringC;
                                    }>]>;
                                }>;
                                defaults: {
                                    query: {
                                        detailTab: import("../app/transaction_details/waterfall_with_summary/transaction_tabs").TransactionTab;
                                        showCriticalPath: string;
                                    };
                                };
                                element: React.JSX.Element;
                            };
                            '/dependencies/overview': {
                                element: React.JSX.Element;
                            };
                        };
                    };
                    "/dependencies/inventory": {
                        element: React.ReactElement<any, any>;
                    } & {
                        params: t.PartialC<{
                            query: t.IntersectionC<[t.TypeC<{
                                comparisonEnabled: t.Type<boolean, boolean, unknown>;
                            }>, t.PartialC<{
                                offset: t.StringC;
                            }>]>;
                        }>;
                    };
                    '/traces': {
                        element: React.JSX.Element;
                        children: {
                            '/traces': {
                                element: React.JSX.Element;
                            };
                        };
                    };
                    "/service-map": {
                        element: React.ReactElement<any, any>;
                        params: t.TypeC<{
                            query: t.TypeC<{
                                serviceGroup: t.StringC;
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
                        params: t.TypeC<{
                            query: t.TypeC<{
                                serviceGroup: t.StringC;
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
                element: React.JSX.Element;
                params: t.IntersectionC<[t.TypeC<{
                    path: t.TypeC<{
                        serviceName: t.StringC;
                    }>;
                }>, t.TypeC<{
                    query: t.IntersectionC<[t.TypeC<{
                        environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
                    }>, t.TypeC<{
                        rangeFrom: t.StringC;
                        rangeTo: t.StringC;
                        kuery: t.StringC;
                        serviceGroup: t.StringC;
                        comparisonEnabled: t.Type<boolean, boolean, unknown>;
                    }>, t.PartialC<{
                        latencyAggregationType: t.UnionC<[t.LiteralC<import("@kbn/apm-types").LatencyAggregationType.avg>, t.LiteralC<import("@kbn/apm-types").LatencyAggregationType.p95>, t.LiteralC<import("@kbn/apm-types").LatencyAggregationType.p99>]>;
                        transactionType: t.StringC;
                        refreshPaused: t.UnionC<[t.LiteralC<"true">, t.LiteralC<"false">]>;
                        refreshInterval: t.StringC;
                    }>, t.PartialC<{
                        offset: t.StringC;
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
                        params: t.PartialC<{
                            query: t.PartialC<{
                                page: t.Type<number, number, unknown>;
                                pageSize: t.Type<number, number, unknown>;
                                sortField: t.StringC;
                                sortDirection: t.UnionC<[t.LiteralC<"asc">, t.LiteralC<"desc">]>;
                                device: t.StringC;
                                osVersion: t.StringC;
                                appVersion: t.StringC;
                                netConnectionType: t.StringC;
                            }>;
                        }>;
                        element: React.ReactElement<any, any>;
                    };
                    '/mobile-services/{serviceName}/transactions': {
                        params: t.PartialC<{
                            query: t.PartialC<{
                                page: t.Type<number, number, unknown>;
                                pageSize: t.Type<number, number, unknown>;
                                sortField: t.StringC;
                                sortDirection: t.UnionC<[t.LiteralC<"asc">, t.LiteralC<"desc">]>;
                                device: t.StringC;
                                osVersion: t.StringC;
                                appVersion: t.StringC;
                                netConnectionType: t.StringC;
                                mobileSelectedTab: t.StringC;
                            }>;
                        }>;
                        children: {
                            '/mobile-services/{serviceName}/transactions/view': {
                                element: React.JSX.Element;
                                params: t.TypeC<{
                                    query: t.IntersectionC<[t.IntersectionC<[t.TypeC<{
                                        comparisonEnabled: t.Type<boolean, boolean, unknown>;
                                        showCriticalPath: t.Type<boolean, boolean, unknown>;
                                    }>, t.PartialC<{
                                        transactionName: t.StringC;
                                    }>]>, t.PartialC<{
                                        traceId: t.StringC;
                                        transactionId: t.StringC;
                                        flyoutDetailTab: t.StringC;
                                        sampleRangeTo: t.Type<number, number, unknown>;
                                        sampleRangeFrom: t.Type<number, number, unknown>;
                                    }>, t.PartialC<{
                                        offset: t.StringC;
                                    }>]>;
                                }>;
                                defaults: {
                                    query: {
                                        showCriticalPath: string;
                                    };
                                };
                            };
                            '/mobile-services/{serviceName}/transactions': {
                                element: React.JSX.Element;
                            };
                        };
                        element: React.ReactElement<any, any>;
                    };
                    '/mobile-services/{serviceName}/errors-and-crashes': {
                        params: t.PartialC<{
                            query: t.PartialC<{
                                page: t.Type<number, number, unknown>;
                                pageSize: t.Type<number, number, unknown>;
                                sortField: t.StringC;
                                sortDirection: t.UnionC<[t.LiteralC<"asc">, t.LiteralC<"desc">]>;
                                mobileErrorTabId: t.StringC;
                                device: t.StringC;
                                osVersion: t.StringC;
                                appVersion: t.StringC;
                                netConnectionType: t.StringC;
                            }>;
                        }>;
                        children: {
                            '/mobile-services/{serviceName}/errors-and-crashes/errors/{groupId}': {
                                element: React.JSX.Element;
                                params: t.TypeC<{
                                    path: t.TypeC<{
                                        groupId: t.StringC;
                                    }>;
                                    query: t.PartialC<{
                                        errorId: t.StringC;
                                    }>;
                                }>;
                            };
                            '/mobile-services/{serviceName}/errors-and-crashes/': {
                                element: React.JSX.Element;
                            };
                            '/mobile-services/{serviceName}/errors-and-crashes/crashes/{groupId}': {
                                element: React.JSX.Element;
                                params: t.TypeC<{
                                    path: t.TypeC<{
                                        groupId: t.StringC;
                                    }>;
                                    query: t.PartialC<{
                                        errorId: t.StringC;
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
                        params: t.PartialC<{
                            query: t.PartialC<{
                                alertStatus: t.StringC;
                            }>;
                        }>;
                        element: React.ReactElement<any, any>;
                    };
                    '/mobile-services/{serviceName}/dashboards': {
                        params: t.PartialC<{
                            query: t.PartialC<{
                                dashboardId: t.StringC;
                            }>;
                        }>;
                        element: React.ReactElement<any, any>;
                    };
                    '/mobile-services/{serviceName}/': {
                        element: React.JSX.Element;
                    };
                };
            };
            '/services/{serviceName}': {
                element: React.JSX.Element;
                params: t.IntersectionC<[t.TypeC<{
                    path: t.TypeC<{
                        serviceName: t.StringC;
                    }>;
                }>, t.TypeC<{
                    query: t.IntersectionC<[t.TypeC<{
                        environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
                    }>, t.TypeC<{
                        rangeFrom: t.StringC;
                        rangeTo: t.StringC;
                        kuery: t.StringC;
                        serviceGroup: t.StringC;
                        comparisonEnabled: t.Type<boolean, boolean, unknown>;
                    }>, t.PartialC<{
                        latencyAggregationType: t.UnionC<[t.LiteralC<import("@kbn/apm-types").LatencyAggregationType.avg>, t.LiteralC<import("@kbn/apm-types").LatencyAggregationType.p95>, t.LiteralC<import("@kbn/apm-types").LatencyAggregationType.p99>]>;
                        transactionType: t.StringC;
                        refreshPaused: t.UnionC<[t.LiteralC<"true">, t.LiteralC<"false">]>;
                        refreshInterval: t.StringC;
                    }>, t.PartialC<{
                        offset: t.StringC;
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
                        params: t.PartialC<{
                            query: t.PartialC<{
                                page: t.Type<number, number, unknown>;
                                pageSize: t.Type<number, number, unknown>;
                                sortField: t.StringC;
                                sortDirection: t.UnionC<[t.LiteralC<"asc">, t.LiteralC<"desc">]>;
                            }>;
                        }>;
                        element: React.ReactElement<any, any>;
                    };
                    '/services/{serviceName}/transactions': {
                        params: t.PartialC<{
                            query: t.PartialC<{
                                page: t.Type<number, number, unknown>;
                                pageSize: t.Type<number, number, unknown>;
                                sortField: t.StringC;
                                sortDirection: t.UnionC<[t.LiteralC<"asc">, t.LiteralC<"desc">]>;
                            }>;
                        }>;
                        children: {
                            '/services/{serviceName}/transactions/view': {
                                element: React.JSX.Element;
                                params: t.TypeC<{
                                    query: t.IntersectionC<[t.IntersectionC<[t.TypeC<{
                                        comparisonEnabled: t.Type<boolean, boolean, unknown>;
                                        showCriticalPath: t.Type<boolean, boolean, unknown>;
                                    }>, t.PartialC<{
                                        transactionName: t.StringC;
                                    }>]>, t.PartialC<{
                                        traceId: t.StringC;
                                        transactionId: t.StringC;
                                        flyoutDetailTab: t.StringC;
                                        sampleRangeTo: t.Type<number, number, unknown>;
                                        sampleRangeFrom: t.Type<number, number, unknown>;
                                        page: t.Type<number, number, unknown>;
                                        pageSize: t.Type<number, number, unknown>;
                                        sortField: t.StringC;
                                        sortDirection: t.UnionC<[t.LiteralC<"asc">, t.LiteralC<"desc">]>;
                                    }>, t.PartialC<{
                                        offset: t.StringC;
                                    }>]>;
                                }>;
                                defaults: {
                                    query: {
                                        showCriticalPath: string;
                                    };
                                };
                            };
                            '/services/{serviceName}/transactions': {
                                element: React.JSX.Element;
                            };
                        };
                        element: React.ReactElement<any, any>;
                    };
                    '/services/{serviceName}/dependencies': {
                        element: React.ReactElement<any, any>;
                    };
                    '/services/{serviceName}/errors': {
                        params: t.PartialC<{
                            query: t.PartialC<{
                                page: t.Type<number, number, unknown>;
                                pageSize: t.Type<number, number, unknown>;
                                sortField: t.StringC;
                                sortDirection: t.UnionC<[t.LiteralC<"asc">, t.LiteralC<"desc">]>;
                            }>;
                        }>;
                        children: {
                            '/services/{serviceName}/errors/{groupId}': {
                                element: React.JSX.Element;
                                params: t.TypeC<{
                                    path: t.TypeC<{
                                        groupId: t.StringC;
                                    }>;
                                    query: t.PartialC<{
                                        errorId: t.StringC;
                                    }>;
                                }>;
                            };
                            '/services/{serviceName}/errors': {
                                element: React.JSX.Element;
                            };
                        };
                        element: React.ReactElement<any, any>;
                    };
                    '/services/{serviceName}/metrics': {
                        children: {
                            '/services/{serviceName}/metrics': {
                                element: React.JSX.Element;
                            };
                            '/services/{serviceName}/metrics/{id}': {
                                element: React.JSX.Element;
                                params: t.TypeC<{
                                    path: t.TypeC<{
                                        id: t.StringC;
                                    }>;
                                }>;
                            };
                        };
                        element: React.ReactElement<any, any>;
                    };
                    '/services/{serviceName}/nodes': {
                        children: {
                            '/services/{serviceName}/nodes/{serviceNodeName}/metrics': {
                                element: React.JSX.Element;
                                params: t.TypeC<{
                                    path: t.TypeC<{
                                        serviceNodeName: t.StringC;
                                    }>;
                                }>;
                            };
                            '/services/{serviceName}/nodes': {
                                element: React.JSX.Element;
                                params: t.PartialC<{
                                    query: t.PartialC<{
                                        sortDirection: t.StringC;
                                        sortField: t.StringC;
                                        pageSize: t.StringC;
                                        page: t.StringC;
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
                        params: t.PartialC<{
                            query: t.PartialC<{
                                detailTab: t.UnionC<[t.LiteralC<import("../app/infra_overview/infra_tabs/use_tabs").InfraTab.containers>, t.LiteralC<import("../app/infra_overview/infra_tabs/use_tabs").InfraTab.pods>, t.LiteralC<import("../app/infra_overview/infra_tabs/use_tabs").InfraTab.hosts>]>;
                            }>;
                        }>;
                        element: React.ReactElement<any, any>;
                    };
                    '/services/{serviceName}/alerts': {
                        params: t.PartialC<{
                            query: t.PartialC<{
                                alertStatus: t.UnionC<[t.LiteralC<"active">, t.LiteralC<"recovered">, t.LiteralC<"all">]>;
                            }>;
                        }>;
                        element: React.ReactElement<any, any>;
                    };
                    '/services/{serviceName}/profiling': {
                        element: React.ReactElement<any, any>;
                    };
                    '/services/{serviceName}/dashboards': {
                        params: t.PartialC<{
                            query: t.PartialC<{
                                dashboardId: t.StringC;
                            }>;
                        }>;
                        element: React.ReactElement<any, any>;
                    };
                    '/services/{serviceName}/': {
                        element: React.JSX.Element;
                    };
                };
            };
            '/settings': {
                element: React.JSX.Element;
                children: {
                    '/settings/general-settings': {
                        element: React.ReactElement;
                    };
                    '/settings/agent-configuration': {
                        element: React.ReactElement;
                    };
                    '/settings/agent-configuration/create': {
                        params: t.PartialC<{
                            query: t.PartialC<{
                                pageStep: t.UnionC<[t.LiteralC<import("../../../common/agent_configuration/constants").AgentConfigurationPageStep.ChooseService>, t.LiteralC<import("../../../common/agent_configuration/constants").AgentConfigurationPageStep.ChooseSettings>, t.LiteralC<import("../../../common/agent_configuration/constants").AgentConfigurationPageStep.Review>]>;
                            }>;
                        }>;
                        element: React.ReactElement;
                    };
                    '/settings/agent-configuration/edit': {
                        params: t.PartialC<{
                            query: t.PartialC<{
                                environment: t.StringC;
                                name: t.StringC;
                                pageStep: t.UnionC<[t.LiteralC<import("../../../common/agent_configuration/constants").AgentConfigurationPageStep.ChooseService>, t.LiteralC<import("../../../common/agent_configuration/constants").AgentConfigurationPageStep.ChooseSettings>, t.LiteralC<import("../../../common/agent_configuration/constants").AgentConfigurationPageStep.Review>]>;
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
                        params: t.TypeC<{
                            query: t.IntersectionC<[t.TypeC<{
                                environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
                            }>, t.TypeC<{
                                kuery: t.StringC;
                                agentLanguage: t.StringC;
                                serviceName: t.StringC;
                            }>]>;
                        }>;
                        element: React.ReactElement;
                    };
                    '/settings': {
                        element: React.JSX.Element;
                    };
                };
            };
            '/diagnostics': {
                element: React.JSX.Element;
                params: t.TypeC<{
                    query: t.IntersectionC<[t.TypeC<{
                        rangeFrom: t.StringC;
                        rangeTo: t.StringC;
                    }>, t.PartialC<{
                        refreshPaused: t.UnionC<[t.LiteralC<"true">, t.LiteralC<"false">]>;
                        refreshInterval: t.StringC;
                        kuery: t.StringC;
                    }>]>;
                }>;
                children: {
                    '/diagnostics': {
                        element: React.JSX.Element;
                        params: t.TypeC<{
                            query: t.IntersectionC<[t.TypeC<{
                                rangeFrom: t.StringC;
                                rangeTo: t.StringC;
                            }>, t.PartialC<{
                                refreshPaused: t.UnionC<[t.LiteralC<"true">, t.LiteralC<"false">]>;
                                refreshInterval: t.StringC;
                                kuery: t.StringC;
                            }>]>;
                        }>;
                    };
                    '/diagnostics/index-pattern-settings': {
                        element: React.JSX.Element;
                        params: t.TypeC<{
                            query: t.IntersectionC<[t.TypeC<{
                                rangeFrom: t.StringC;
                                rangeTo: t.StringC;
                            }>, t.PartialC<{
                                refreshPaused: t.UnionC<[t.LiteralC<"true">, t.LiteralC<"false">]>;
                                refreshInterval: t.StringC;
                                kuery: t.StringC;
                            }>]>;
                        }>;
                    };
                    '/diagnostics/index-templates': {
                        element: React.JSX.Element;
                        params: t.TypeC<{
                            query: t.IntersectionC<[t.TypeC<{
                                rangeFrom: t.StringC;
                                rangeTo: t.StringC;
                            }>, t.PartialC<{
                                refreshPaused: t.UnionC<[t.LiteralC<"true">, t.LiteralC<"false">]>;
                                refreshInterval: t.StringC;
                                kuery: t.StringC;
                            }>]>;
                        }>;
                    };
                    '/diagnostics/data-streams': {
                        element: React.JSX.Element;
                        params: t.TypeC<{
                            query: t.IntersectionC<[t.TypeC<{
                                rangeFrom: t.StringC;
                                rangeTo: t.StringC;
                            }>, t.PartialC<{
                                refreshPaused: t.UnionC<[t.LiteralC<"true">, t.LiteralC<"false">]>;
                                refreshInterval: t.StringC;
                                kuery: t.StringC;
                            }>]>;
                        }>;
                    };
                    '/diagnostics/indices': {
                        element: React.JSX.Element;
                        params: t.TypeC<{
                            query: t.IntersectionC<[t.TypeC<{
                                rangeFrom: t.StringC;
                                rangeTo: t.StringC;
                            }>, t.PartialC<{
                                refreshPaused: t.UnionC<[t.LiteralC<"true">, t.LiteralC<"false">]>;
                                refreshInterval: t.StringC;
                                kuery: t.StringC;
                            }>]>;
                        }>;
                    };
                    '/diagnostics/documents': {
                        element: React.JSX.Element;
                        params: t.TypeC<{
                            query: t.IntersectionC<[t.TypeC<{
                                rangeFrom: t.StringC;
                                rangeTo: t.StringC;
                            }>, t.PartialC<{
                                refreshPaused: t.UnionC<[t.LiteralC<"true">, t.LiteralC<"false">]>;
                                refreshInterval: t.StringC;
                                kuery: t.StringC;
                            }>]>;
                        }>;
                    };
                    '/diagnostics/import-export': {
                        element: React.JSX.Element;
                        params: t.TypeC<{
                            query: t.IntersectionC<[t.TypeC<{
                                rangeFrom: t.StringC;
                                rangeTo: t.StringC;
                            }>, t.PartialC<{
                                refreshPaused: t.UnionC<[t.LiteralC<"true">, t.LiteralC<"false">]>;
                                refreshInterval: t.StringC;
                                kuery: t.StringC;
                            }>]>;
                        }>;
                    };
                };
            };
            '/onboarding': {
                element: React.JSX.Element;
                params: t.PartialC<{
                    query: t.PartialC<{
                        agent: t.UnionC<[t.LiteralC<import("../app/onboarding/instruction_variants").INSTRUCTION_VARIANT.NODE>, t.LiteralC<import("../app/onboarding/instruction_variants").INSTRUCTION_VARIANT.DJANGO>, t.LiteralC<import("../app/onboarding/instruction_variants").INSTRUCTION_VARIANT.FLASK>, t.LiteralC<import("../app/onboarding/instruction_variants").INSTRUCTION_VARIANT.RAILS>, t.LiteralC<import("../app/onboarding/instruction_variants").INSTRUCTION_VARIANT.RACK>, t.LiteralC<import("../app/onboarding/instruction_variants").INSTRUCTION_VARIANT.GO>, t.LiteralC<import("../app/onboarding/instruction_variants").INSTRUCTION_VARIANT.JAVA>, t.LiteralC<import("../app/onboarding/instruction_variants").INSTRUCTION_VARIANT.DOTNET>, t.LiteralC<import("../app/onboarding/instruction_variants").INSTRUCTION_VARIANT.PHP>]>;
                    }>;
                }>;
            };
            '/tutorial': {
                element: React.JSX.Element;
            };
            '/service-groups': {
                element: React.JSX.Element;
                params: t.TypeC<{
                    query: t.IntersectionC<[t.TypeC<{
                        environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
                    }>, t.TypeC<{
                        rangeFrom: t.StringC;
                        rangeTo: t.StringC;
                        kuery: t.StringC;
                        comparisonEnabled: t.Type<boolean, boolean, unknown>;
                    }>, t.TypeC<{
                        serviceGroup: t.StringC;
                    }>, t.PartialC<{
                        refreshPaused: t.UnionC<[t.LiteralC<"true">, t.LiteralC<"false">]>;
                        refreshInterval: t.StringC;
                    }>, t.PartialC<{
                        offset: t.StringC;
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
export type ApmRouter = typeof apmRouter;
export {};
