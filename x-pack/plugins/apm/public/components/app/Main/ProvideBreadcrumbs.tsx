/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Location } from 'history';
import React from 'react';
import {
  matchPath,
  RouteComponentProps,
  RouteProps,
  withRouter
} from 'react-router-dom';

type LocationMatch<T = any> = Pick<
  RouteComponentProps<T>,
  'location' | 'match'
>;

export type BreadcrumbFunction<T = any> = (props: LocationMatch<T>) => string;

export interface BreadcrumbRoute<T = any> extends RouteProps {
  breadcrumb: string | BreadcrumbFunction<T> | null;
}

export interface Breadcrumb extends LocationMatch {
  value: string;
}

export interface RenderProps extends RouteComponentProps {
  breadcrumbs: Breadcrumb[];
}

export interface ProvideBreadcrumbsProps extends RouteComponentProps {
  routes: BreadcrumbRoute[];
  render: (props: RenderProps) => React.ReactElement<any> | null;
}

interface ParseOptions extends LocationMatch {
  breadcrumb: string | BreadcrumbFunction;
}

const parse = (options: ParseOptions) => {
  const { breadcrumb, match, location } = options;
  let value;

  if (typeof breadcrumb === 'function') {
    value = breadcrumb({ match, location });
  } else {
    value = breadcrumb;
  }

  return { value, match, location };
};

const getBreadcrumb = ({
  location,
  currentPath,
  routes
}: {
  location: Location;
  currentPath: string;
  routes: BreadcrumbRoute[];
}) =>
  routes.reduce<Breadcrumb | null>((found, { breadcrumb, ...route }) => {
    if (found) {
      return found;
    }

    if (!breadcrumb) {
      return null;
    }

    const match = matchPath(currentPath, route);

    if (match) {
      return parse({
        breadcrumb,
        match,
        location
      });
    }

    return null;
  }, null);

export const getBreadcrumbs = ({
  routes,
  location
}: {
  routes: BreadcrumbRoute[];
  location: Location;
}) => {
  const matches: Breadcrumb[] = [];
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
        routes
      });

      if (breadcrumb) {
        matches.push(breadcrumb);
      }

      return currentPath === '/' ? '' : currentPath;
    }, '');

  return matches;
};

function ProvideBreadcrumbsComponent({
  routes = [],
  render,
  location,
  match,
  history
}: ProvideBreadcrumbsProps) {
  const breadcrumbs = getBreadcrumbs({ routes, location });
  return render({ breadcrumbs, location, match, history });
}

export const ProvideBreadcrumbs = withRouter(ProvideBreadcrumbsComponent);
