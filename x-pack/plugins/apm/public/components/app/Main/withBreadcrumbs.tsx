/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  matchPath,
  RouteComponentProps,
  RouteProps,
  withRouter
} from 'react-router-dom';

export type BreadcrumbFunction = (props: RouteComponentProps) => string | null;

export interface BreadcrumbRoute extends RouteProps {
  breadcrumb: string | BreadcrumbFunction;
}

const render = (props: RouteComponentProps) => {
  const { breadcrumb, match, location } = props;
  if (typeof breadcrumb === 'function') {
    return breadcrumb(props);
  }

  return { value: breadcrumb, match, location };
};

const getBreadcrumb = ({ location, currentPath, routes }) =>
  routes.reduce((matchingBreadcrumb, { breadcrumb, path, ...rest }) => {
    if (matchingBreadcrumb) {
      return matchingBreadcrumb;
    }
    const match = matchPath(currentPath, { path, ...rest });

    if (match) {
      if (!breadcrumb) {
        return null;
      }

      return render({
        breadcrumb,
        match,
        location,
        ...rest
      });
    }
    return null;
  }, null);

export const getBreadcrumbs = ({
  routes,
  location,
  options = {}
}): string[] => {
  const matches = [];
  const { pathname } = location;

  pathname
    .split('?')[0]
    .replace(/\/$/, '')
    .split('/')
    .reduce((acc, next) => {
      // `/1/2/3` results in match checks for `/1`, `/1/2`, `/1/2/3`.
      const currentPath = !next ? '/' : `${acc}/${next}`;
      const breadcrumb = getBreadcrumb({
        location,
        currentPath,
        routes,
        ...options
      });

      if (breadcrumb) {
        matches.push(breadcrumb);
      }

      return currentPath === '/' ? '' : currentPath;
    }, null);

  return matches;
};

interface Breadcrumb {
  value: string;
  match: {
    url: string;
  };
}

interface Props extends RouteComponentProps {
  breadcrumbs: string[];
}

export function withBreadcrumbs(routes = []) {
  return (Component: React.ComponentType) =>
    withRouter<Props>(props => <Component {...props} breadcrumbs={[]} />);
}
