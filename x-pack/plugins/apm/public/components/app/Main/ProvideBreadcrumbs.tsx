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
  withRouter,
} from 'react-router-dom';
import { RouteName } from './route_config/route_names';

type LocationMatch = Pick<
  RouteComponentProps<Record<string, string>>,
  'location' | 'match'
>;

type BreadcrumbFunction = (props: LocationMatch) => string;

export interface BreadcrumbRoute extends RouteProps {
  breadcrumb: string | BreadcrumbFunction | null;
  name: RouteName;
}

export interface Breadcrumb extends LocationMatch {
  value: string;
}

interface RenderProps extends RouteComponentProps {
  breadcrumbs: Breadcrumb[];
}

interface ProvideBreadcrumbsProps extends RouteComponentProps {
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

export function getBreadcrumb({
  location,
  currentPath,
  routes,
}: {
  location: Location;
  currentPath: string;
  routes: BreadcrumbRoute[];
}) {
  return routes.reduce<Breadcrumb | null>((found, { breadcrumb, ...route }) => {
    if (found) {
      return found;
    }

    if (!breadcrumb) {
      return null;
    }

    const match = matchPath<Record<string, string>>(currentPath, route);

    if (match) {
      return parse({
        breadcrumb,
        match,
        location,
      });
    }

    return null;
  }, null);
}

export function getBreadcrumbs({
  routes,
  location,
}: {
  routes: BreadcrumbRoute[];
  location: Location;
}) {
  const breadcrumbs: Breadcrumb[] = [];
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
      });

      if (breadcrumb) {
        breadcrumbs.push(breadcrumb);
      }

      return currentPath === '/' ? '' : currentPath;
    }, '');

  return breadcrumbs;
}

function ProvideBreadcrumbsComponent({
  routes = [],
  render,
  location,
  match,
  history,
}: ProvideBreadcrumbsProps) {
  const breadcrumbs = getBreadcrumbs({ routes, location });
  return render({ breadcrumbs, location, match, history });
}

export const ProvideBreadcrumbs = withRouter(ProvideBreadcrumbsComponent);
