/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { matchPath, useLocation } from 'react-router-dom';
import { partition } from 'lodash/fp';
import { SecurityPageName } from '@kbn/security-solution-plugin/common';
import type { SolutionSideNavItem } from '@kbn/security-solution-side-nav';
import { useKibana } from '../services';
import { useGetLinkProps } from './use_link_props';
import { useNavLinks } from './use_nav_links';

const isFooterNavItem = (id: string) =>
  id === SecurityPageName.landing || id === SecurityPageName.administration;

const isGetStartedNavItem = (id: string) => id === SecurityPageName.landing;

// DFS for the sideNavItem matching the current `pathname`, returns all item hierarchy when found
const findItemsByPath = (
  sideNavItems: SolutionSideNavItem[],
  pathname: string
): SolutionSideNavItem[] => {
  for (const sideNavItem of sideNavItems) {
    if (sideNavItem.items?.length) {
      const found = findItemsByPath(sideNavItem.items, pathname);
      if (found.length) {
        found.unshift(sideNavItem);
        return found;
      }
    }
    if (matchPath(pathname, { path: sideNavItem.href })) {
      return [sideNavItem];
    }
  }
  return [];
};

/**
 * Returns all the formatted SideNavItems, including external links
 */
export const useSideNavItems = (): SolutionSideNavItem[] => {
  const navLinks = useNavLinks();
  const getLinkProps = useGetLinkProps();

  const securitySideNavItems = useMemo(
    () =>
      navLinks.reduce<SolutionSideNavItem[]>((items, navLink) => {
        if (navLink.disabled) {
          return items;
        }
        if (isGetStartedNavItem(navLink.id)) {
          items.push({
            id: navLink.id,
            label: navLink.title.toUpperCase(),
            ...getLinkProps({ deepLinkId: navLink.id }),
            labelSize: 'xs',
            iconType: 'launch',
            appendSeparator: true,
          });
        } else {
          // default sideNavItem formatting
          items.push({
            id: navLink.id,
            label: navLink.title,
            ...getLinkProps({ deepLinkId: navLink.id }),
            ...(navLink.categories?.length && { categories: navLink.categories }),
            ...(navLink.links?.length && {
              items: navLink.links.reduce<SolutionSideNavItem[]>((acc, current) => {
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
          });
        }
        return items;
      }, []),
    [getLinkProps, navLinks]
  );

  const sideNavItems = useAddExternalSideNavItems(securitySideNavItems);

  return sideNavItems;
};

/**
 * @param securitySideNavItems the sideNavItems for Security pages
 * @returns sideNavItems with Security and external links
 */
const useAddExternalSideNavItems = (securitySideNavItems: SolutionSideNavItem[]) => {
  const sideNavItemsWithExternals = useMemo(
    () => [
      ...securitySideNavItems,
      // TODO: add external links. e.g.:
      // {
      //   id: 'ml',
      //   label: 'Machine Learning Jobs',
      //   ...getLinkProps({ appId: 'ml', path: '/jobs' }),
      //   links: [...]
      // },
    ],
    [securitySideNavItems]
  );

  return sideNavItemsWithExternals;
};

/**
 * Partitions the sideNavItems into main and footer SideNavItems
 * @param sideNavItems array for all SideNavItems
 * @returns `[items, footerItems]` to be used in the side navigation component
 */
export const usePartitionFooterNavItems = (
  sideNavItems: SolutionSideNavItem[]
): [SolutionSideNavItem[], SolutionSideNavItem[]] =>
  useMemo(() => partition((item) => !isFooterNavItem(item.id), sideNavItems), [sideNavItems]);

/**
 * Returns the selected item id, which is the root item in the links hierarchy
 */
export const useSideNavSelectedId = (sideNavItems: SolutionSideNavItem[]): string => {
  const { http } = useKibana().services;
  const { pathname } = useLocation();

  const selectedId: string = useMemo(() => {
    const [rootNavItem] = findItemsByPath(sideNavItems, http.basePath.prepend(pathname));
    return rootNavItem?.id ?? '';
  }, [sideNavItems, pathname, http]);

  return selectedId;
};
