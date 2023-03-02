/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import type { NavigationLink } from '@kbn/security-solution-plugin/public/common/links';
import { APP_UI_ID, SecurityPageName } from '@kbn/security-solution-plugin/common';
import type { SideNavItem, DefaultSideNavItem } from '@kbn/shared-ux-side-navigation';
import useObservable from 'react-use/lib/useObservable';
import { matchPath, useLocation } from 'react-router-dom';
import { useKibana } from '../services';
import { useGetLinkProps } from './use_link_props';
import { formatGetStartedItem } from '../components/side_navigation/get_started_nav_item';

const isFooterNavItem = (id: SecurityPageName) =>
  id === SecurityPageName.landing || id === SecurityPageName.administration;

const isGetStartedNavItem = (id: SecurityPageName) => id === SecurityPageName.landing;

const useFindItemsByPath = () => {
  const { getUrlForApp } = useKibana().services.application;

  // DFS for the item that matches the path, returns all item hierarchy when found
  const findItemsByPath = useCallback(
    (navLinks: NavigationLink[], pathname: string): NavigationLink[] => {
      for (const navLink of navLinks) {
        if (navLink.links?.length) {
          const found = findItemsByPath(navLink.links, pathname);
          if (found.length) {
            found.unshift(navLink);
            return found;
          }
        }
        const path = getUrlForApp(APP_UI_ID, { deepLinkId: navLink.id });
        if (matchPath(pathname, { path })) {
          return [navLink];
        }
      }
      return [];
    },
    [getUrlForApp]
  );

  return findItemsByPath;
};

/**
 * Returns the formatted `items` and `footerItems` to be rendered in the navigation
 */
export const useSideNavItems = () => {
  const { securitySolution } = useKibana().services;
  const navLinks = useObservable(securitySolution.navLinks$, []);
  const getLinkProps = useGetLinkProps();

  const formatDefaultItem = useCallback(
    (navItem: NavigationLink): DefaultSideNavItem => ({
      id: navItem.id,
      label: navItem.title,
      ...getLinkProps({ deepLinkId: navItem.id }),
      ...(navItem.categories?.length && { categories: navItem.categories }),
      ...(navItem.links?.length && {
        items: navItem.links.reduce<DefaultSideNavItem[]>((acc, current) => {
          if (!current.disabled) {
            acc.push({
              id: current.id,
              label: current.title,
              description: current.description,
              isBeta: current.isBeta,
              betaOptions: current.betaOptions,
              ...getLinkProps({ deepLinkId: current.id }),
            });
          }
          return acc;
        }, []),
      }),
    }),
    [getLinkProps]
  );

  const sideNavItems = useMemo(() => {
    const mainNavItems: SideNavItem[] = [];
    const footerNavItems: SideNavItem[] = [];
    navLinks.forEach((navLink) => {
      if (navLink.disabled) {
        return;
      }
      const sideNavItem = isGetStartedNavItem(navLink.id)
        ? formatGetStartedItem(navLink)
        : formatDefaultItem(navLink);

      if (isFooterNavItem(navLink.id)) {
        footerNavItems.push(sideNavItem);
      } else {
        mainNavItems.push(sideNavItem);
      }
    });

    return [mainNavItems, footerNavItems];
  }, [navLinks, formatDefaultItem]);

  return sideNavItems;
};

/**
 * Returns the selected item id, which is the root item in the links hierarchy
 */
export const useSideNavSelectedId = (): string => {
  const { pathname } = useLocation(); // TODO: solve (not) updating problem
  const { securitySolution } = useKibana().services;
  const navLinks = useObservable(securitySolution.navLinks$, []);

  const findItemsByPath = useFindItemsByPath();

  const selectedId: string = useMemo(() => {
    const [rootNavItem] = findItemsByPath(navLinks, pathname);
    return rootNavItem?.id ?? '';
  }, [navLinks, findItemsByPath, pathname]);

  return selectedId;
};
