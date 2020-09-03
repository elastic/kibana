/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { History, Location } from 'history';
import { MouseEvent, useEffect } from 'react';
import {
  matchPath,
  RouteComponentProps,
  useHistory,
  useLocation,
} from 'react-router-dom';
import { useApmPluginContext } from './useApmPluginContext';
import { APMRouteDefinition, BreadcrumbTitle } from '../application/routes';

interface Breadcrumb {
  href?: string;
  text: string | null;
  onClick: (event: MouseEvent<HTMLAnchorElement>) => void;
}

interface BreadcrumbFunctionArgs extends RouteComponentProps {
  breadcrumbTitle: BreadcrumbTitle;
}

function getBreadcrumbText({
  breadcrumbTitle,
  history,
  location,
  match,
}: BreadcrumbFunctionArgs) {
  return typeof breadcrumbTitle === 'function'
    ? breadcrumbTitle({ history, location, match })
    : breadcrumbTitle;
}

/**
 * Convert a route definitions into a breadcrumb
 */
function getBreadcrumb({
  currentPath,
  history,
  location,
  navigateToUrl,
  routes,
}: {
  currentPath: string;
  history: History;
  location: Location;
  navigateToUrl: (url: string) => Promise<void>;
  routes: APMRouteDefinition[];
}) {
  return routes.reduce<Breadcrumb | null>(
    (found, { breadcrumb, ...routeDefinition }) => {
      if (found) {
        return found;
      }

      if (!breadcrumb) {
        return null;
      }

      const match = matchPath<Record<string, string>>(
        currentPath,
        routeDefinition
      );

      if (match) {
        let href = '';
        return {
          text: getBreadcrumbText({
            breadcrumbTitle: breadcrumb,
            history,
            location,
            match,
          }),
          href: undefined,
          onClick: (event: MouseEvent<HTMLAnchorElement>) => {
            if (href) {
              event.preventDefault();
              navigateToUrl(href);
            }
          },
        };
      }

      return null;
    },
    null
  );

  // return {
  //   text: '',
  //   href: undefined,
  //  ,
  // };
}

/**
 * Convert a list of route definitions to a list of breadcrumbs
 */
function routeDefinitionsToBreadcrumbs({
  history,
  location,
  navigateToUrl,
  routes,
}: {
  history: History;
  location: Location;
  navigateToUrl: (url: string) => Promise<void>;
  routes: APMRouteDefinition[];
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
        currentPath,
        history,
        location,
        navigateToUrl,
        routes,
      });

      if (breadcrumb) {
        breadcrumbs.push(breadcrumb);
      }

      return currentPath === '/' ? '' : currentPath;
    }, '');

  return breadcrumbs;
}

/**
 *
 * Get an array for a page title from a list of breadcrumbs
 */
function getTitleFromBreadcrumbs(breadcrumbs: Breadcrumb[]): string[] {
  function removeNull(text: string | null): text is string {
    return text !== null;
  }

  return breadcrumbs
    .map(({ text }) => text)
    .filter(removeNull)
    .reverse();
}

/**
 * Determine the breadcrumbs from the routes, set them, and update the page
 * title when the route changes.
 */
export function useBreadcrumbs(routes: APMRouteDefinition[]) {
  const history = useHistory();
  const location = useLocation();
  const { core } = useApmPluginContext();
  const { navigateToUrl } = core.application;
  const { setBreadcrumbs } = core.chrome;
  const changeTitle = core.chrome.docTitle.change;

  const breadcrumbs = routeDefinitionsToBreadcrumbs({
    history,
    location,
    navigateToUrl,
    routes,
  });
  const title = getTitleFromBreadcrumbs(breadcrumbs);

  useEffect(() => {
    changeTitle(title);

    setBreadcrumbs(breadcrumbs);
  }, [breadcrumbs, changeTitle, location, title, setBreadcrumbs]);
}
