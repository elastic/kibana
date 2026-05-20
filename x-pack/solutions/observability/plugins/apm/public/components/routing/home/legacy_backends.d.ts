import * as t from 'io-ts';
import React from 'react';
export declare const legacyBackends: {
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
};
