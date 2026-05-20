import type * as t from 'io-ts';
import React from 'react';
import type { Route } from '@kbn/typed-react-router-config';
export declare function page<TPath extends string, TChildren extends Record<string, Route> | undefined = undefined, TParams extends t.Type<any> | undefined = undefined>({ path, element, children, title, searchBar, showServiceGroupSaveButton, params, }: {
    path: TPath;
    element: React.ReactElement<any, any>;
    children?: TChildren;
    title: string;
    searchBar?: React.ReactNode;
    showServiceGroupSaveButton?: boolean;
    params?: TParams;
}): Record<TPath, {
    element: React.ReactElement<any, any>;
} & (TChildren extends Record<string, Route> ? {
    children: TChildren;
} : {}) & (TParams extends t.Type<any> ? {
    params: TParams;
} : {})>;
