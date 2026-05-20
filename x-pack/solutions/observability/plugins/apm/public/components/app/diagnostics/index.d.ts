import React from 'react';
import * as t from 'io-ts';
export declare const diagnosticsRoute: {
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
};
