import type * as t from 'io-ts';
import React from 'react';
import type { LatencyAggregationType } from '../../../../common/latency_aggregation_types';
import type { MobileServiceTemplate } from '../templates/mobile_service_template';
import type { MobileSearchBar } from '../../app/mobile/search_bar';
export declare function page({ title, tabKey, element, searchBarOptions, customSearchBar, bottomHeaderContent, contentWrapper, contextWrapper: ContextWrapper, }: {
    title: string;
    tabKey: React.ComponentProps<typeof MobileServiceTemplate>['selectedTabKey'];
    element: React.ReactElement<any, any>;
    searchBarOptions?: React.ComponentProps<typeof MobileSearchBar>;
    customSearchBar?: React.ReactNode;
    bottomHeaderContent?: React.ComponentType;
    contentWrapper?: React.ComponentType<{
        children: React.ReactNode;
    }>;
    contextWrapper?: React.ComponentType<{
        children: React.ReactNode;
    }>;
}): {
    element: React.ReactElement<any, any>;
};
export declare const mobileServiceDetailRoute: {
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
};
