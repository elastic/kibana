import * as t from 'io-ts';
import React from 'react';
import { TransactionTab } from '../../app/transaction_details/waterfall_with_summary/transaction_tabs';
export declare const DependenciesInventoryTitle: string;
export declare const dependencies: {
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
                        detailTab: t.UnionC<[t.LiteralC<TransactionTab.timeline>, t.LiteralC<TransactionTab.metadata>, t.LiteralC<TransactionTab.logs>]>;
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
                        detailTab: TransactionTab;
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
};
