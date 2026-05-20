import type * as t from 'io-ts';
import React from 'react';
export declare const ServiceInventoryTitle: string;
export declare const ServiceMapTitle: string;
export declare const DependenciesOperationsTitle: string;
export declare const homeRoute: {
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
                                detailTab: t.UnionC<[t.LiteralC<import("../../app/transaction_details/waterfall_with_summary/transaction_tabs").TransactionTab.timeline>, t.LiteralC<import("../../app/transaction_details/waterfall_with_summary/transaction_tabs").TransactionTab.metadata>, t.LiteralC<import("../../app/transaction_details/waterfall_with_summary/transaction_tabs").TransactionTab.logs>]>;
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
                                detailTab: import("../../app/transaction_details/waterfall_with_summary/transaction_tabs").TransactionTab;
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
};
