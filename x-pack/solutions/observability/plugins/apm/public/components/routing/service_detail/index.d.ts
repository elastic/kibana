import type * as t from 'io-ts';
import React from 'react';
import type { LatencyAggregationType } from '../../../../common/latency_aggregation_types';
import type { InfraTab } from '../../app/infra_overview/infra_tabs/use_tabs';
export declare const serviceDetailRoute: {
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
                latencyAggregationType: t.UnionC<[t.LiteralC<LatencyAggregationType.avg>, t.LiteralC<LatencyAggregationType.p95>, t.LiteralC<LatencyAggregationType.p99>]>;
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
                latencyAggregationType: LatencyAggregationType;
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
                        detailTab: t.UnionC<[t.LiteralC<InfraTab.containers>, t.LiteralC<InfraTab.pods>, t.LiteralC<InfraTab.hosts>]>;
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
};
