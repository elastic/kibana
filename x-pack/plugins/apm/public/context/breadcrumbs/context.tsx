/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  Route,
  RouteMatch,
  useMatchRoutes,
} from '@kbn/typed-react-router-config';
import { ChromeBreadcrumb } from '@kbn/core/public';
import { compact, isEqual } from 'lodash';
import React, { createContext, useMemo, useState } from 'react';
import { useBreadcrumbs } from '@kbn/observability-plugin/public';

export interface Breadcrumb {
  title: string;
  href: string;
}

interface BreadcrumbApi {
  set(route: Route, breadcrumb: Breadcrumb[]): void;
  unset(route: Route): void;
  getBreadcrumbs(matches: RouteMatch[]): Breadcrumb[];
}

export const BreadcrumbsContext = createContext<BreadcrumbApi | undefined>(
  undefined
);

export function BreadcrumbsContextProvider({
  children,
}: {
  children: React.ReactElement;
}) {
  const [, forceUpdate] = useState({});

  const breadcrumbs = useMemo(() => {
    return new Map<Route, Breadcrumb[]>();
  }, []);

  const matches: RouteMatch[] = useMatchRoutes();

  const api = useMemo<BreadcrumbApi>(
    () => ({
      set(route, breadcrumb) {
        if (!isEqual(breadcrumbs.get(route), breadcrumb)) {
          breadcrumbs.set(route, breadcrumb);
          forceUpdate({});
        }
      },
      unset(route) {
        if (breadcrumbs.has(route)) {
          breadcrumbs.delete(route);
          forceUpdate({});
        }
      },
      getBreadcrumbs(currentMatches: RouteMatch[]) {
        return compact(
          currentMatches.flatMap((match) => {
            const breadcrumb = breadcrumbs.get(match.route);

            return breadcrumb;
          })
        );
      },
    }),
    [breadcrumbs]
  );

  const formattedBreadcrumbs: ChromeBreadcrumb[] = api
    .getBreadcrumbs(matches)
    .map((breadcrumb, index, array) => {
      return {
        text: breadcrumb.title,
        ...(index === array.length - 1
          ? {}
          : {
              href: breadcrumb.href,
            }),
      };
    });

  useBreadcrumbs(formattedBreadcrumbs);

  return (
    <BreadcrumbsContext.Provider value={api}>
      {children}
    </BreadcrumbsContext.Provider>
  );
}
