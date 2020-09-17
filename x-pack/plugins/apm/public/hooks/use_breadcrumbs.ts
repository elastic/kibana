/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { History, Location } from 'history';
import { ChromeBreadcrumb } from 'kibana/public';
import { MouseEvent, ReactNode, useEffect } from 'react';
import {
  matchPath,
  RouteComponentProps,
  useHistory,
  match as Match,
  useLocation,
} from 'react-router-dom';
import { APMRouteDefinition, BreadcrumbTitle } from '../application/routes';
import { getAPMHref } from '../components/shared/Links/apm/APMLink';
import { useApmPluginContext } from './useApmPluginContext';

interface BreadcrumbWithoutLink extends ChromeBreadcrumb {
  match: Match<Record<string, string>>;
}

interface BreadcrumbFunctionArgs extends RouteComponentProps {
  breadcrumbTitle: BreadcrumbTitle;
}

/**
 * Call the breadcrumb function if there is one, otherwise return it as a string
 */
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
 * Get a breadcrumb from the current path and route definitions.
 */
function getBreadcrumb({
  currentPath,
  history,
  location,
  routes,
}: {
  currentPath: string;
  history: History;
  location: Location;
  routes: APMRouteDefinition[];
}) {
  return routes.reduce<BreadcrumbWithoutLink | null>(
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
        return {
          match,
          text: getBreadcrumbText({
            breadcrumbTitle: breadcrumb,
            history,
            location,
            match,
          }),
        };
      }

      return null;
    },
    null
  );
}

/**
 * Once we have the breadcrumbs, we need to iterate through the list again to
 * add the href and onClick, since we need to know which one is the final
 * breadcrumb
 */
function addLinksToBreadcrumbs({
  breadcrumbs,
  navigateToUrl,
  wrappedGetAPMHref,
}: {
  breadcrumbs: BreadcrumbWithoutLink[];
  navigateToUrl: (url: string) => Promise<void>;
  wrappedGetAPMHref: (path: string) => string;
}) {
  return breadcrumbs.map((breadcrumb, index) => {
    const isLastBreadcrumbItem = index === breadcrumbs.length - 1;

    // Make the link not clickable if it's the last item
    const href = isLastBreadcrumbItem
      ? undefined
      : wrappedGetAPMHref(breadcrumb.match.url);
    const onClick = !href
      ? undefined
      : (event: MouseEvent<HTMLAnchorElement>) => {
          event.preventDefault();
          navigateToUrl(href);
        };

    return {
      ...breadcrumb,
      match: undefined,
      href,
      onClick,
    };
  });
}

/**
 * Convert a list of route definitions to a list of breadcrumbs
 */
function routeDefinitionsToBreadcrumbs({
  history,
  location,
  routes,
}: {
  history: History;
  location: Location;
  routes: APMRouteDefinition[];
}) {
  const breadcrumbs: BreadcrumbWithoutLink[] = [];
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
 * Get an array for a page title from a list of breadcrumbs
 */
function getTitleFromBreadcrumbs(breadcrumbs: ChromeBreadcrumb[]): string[] {
  function removeNonStrings(item: ReactNode): item is string {
    return typeof item === 'string';
  }

  return breadcrumbs
    .map(({ text }) => text)
    .reverse()
    .filter(removeNonStrings);
}

/**
 * Determine the breadcrumbs from the routes, set them, and update the page
 * title when the route changes.
 */
export function useBreadcrumbs(routes: APMRouteDefinition[]) {
  const history = useHistory();
  const location = useLocation();
  const { search } = location;
  const { core } = useApmPluginContext();
  const { basePath } = core.http;
  const { navigateToUrl } = core.application;
  const { docTitle, setBreadcrumbs } = core.chrome;
  const changeTitle = docTitle.change;

  function wrappedGetAPMHref(path: string) {
    return getAPMHref({ basePath, path, search });
  }

  const breadcrumbsWithoutLinks = routeDefinitionsToBreadcrumbs({
    history,
    location,
    routes,
  });
  const breadcrumbs = addLinksToBreadcrumbs({
    breadcrumbs: breadcrumbsWithoutLinks,
    wrappedGetAPMHref,
    navigateToUrl,
  });
  const title = getTitleFromBreadcrumbs(breadcrumbs);

  useEffect(() => {
    changeTitle(title);
    setBreadcrumbs(breadcrumbs);
  }, [breadcrumbs, changeTitle, location, title, setBreadcrumbs]);
}
