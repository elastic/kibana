import React from 'react';
import type { Location } from 'history';
import type { RouteComponentProps } from 'react-router-dom';
/**
 * Function that returns a react component to redirect to a given pathname removing hash-based URLs
 * @param pathname
 */
export declare function redirectTo(pathname: string): ({ location }: RouteComponentProps<{}>) => React.JSX.Element;
/**
 * React component to redirect to a given pathname removing hash-based URLs
 * @param param0
 */
export declare function RedirectTo({ pathname }: {
    pathname: string;
}): React.JSX.Element;
interface Props {
    location: Location;
    pathname: string;
}
/**
 * Given a pathname, redirect to that location, preserving the search and maintaining
 * backward-compatibilty with legacy (pre-7.9) hash-based URLs.
 */
export declare function RenderRedirectTo(props: Props): React.JSX.Element;
export {};
