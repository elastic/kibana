/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { SecurityPageName, type NavigationLink } from '@kbn/security-solution-navigation';
import { useGetLinkProps } from '@kbn/security-solution-navigation/links';
import {
  SolutionSideNavItemPosition,
  type SolutionSideNavItem,
} from '@kbn/security-solution-side-nav';
import { useNavLinks } from '../../common/hooks/use_nav_links';
import { ExternalPageName } from '../links/constants';

type GetLinkProps = (link: NavigationLink) => {
  href: string & Partial<SolutionSideNavItem>;
};

const isBottomNavItem = (id: string) =>
  id === SecurityPageName.landing ||
  id === SecurityPageName.projectSettings ||
  id === ExternalPageName.devTools;
const isGetStartedNavItem = (id: string) => id === SecurityPageName.landing;

/**
 * Formats generic navigation links into the shape expected by the `SolutionSideNav`
 */
const formatLink = (navLink: NavigationLink, getLinkProps: GetLinkProps): SolutionSideNavItem => {
  const items = navLink.links?.reduce<SolutionSideNavItem[]>((acc, current) => {
    if (!current.disabled) {
      acc.push({
        id: current.id,
        label: current.title,
        iconType: current.sideNavIcon,
        isBeta: current.isBeta,
        betaOptions: current.betaOptions,
        ...getLinkProps(current),
      });
    }
    return acc;
  }, []);

  return {
    id: navLink.id,
    label: navLink.title,
    iconType: navLink.sideNavIcon,
    position: isBottomNavItem(navLink.id)
      ? SolutionSideNavItemPosition.bottom
      : SolutionSideNavItemPosition.top,
    ...getLinkProps(navLink),
    ...(navLink.categories?.length && { categories: navLink.categories }),
    ...(items && { items }),
  };
};

/**
 * Formats the get started navigation links into the shape expected by the `SolutionSideNav`
 */
const formatGetStartedLink = (
  navLink: NavigationLink,
  getLinkProps: GetLinkProps
): SolutionSideNavItem => ({
  id: navLink.id,
  label: navLink.title,
  iconType: navLink.sideNavIcon,
  position: SolutionSideNavItemPosition.bottom,
  ...getLinkProps(navLink),
  appendSeparator: true,
});

/**
 * Returns all the formatted SideNavItems, including external links
 */
export const useSideNavItems = (): SolutionSideNavItem[] => {
  const navLinks = useNavLinks();
  const getKibanaLinkProps = useGetLinkProps();

  const getLinkProps = useCallback<GetLinkProps>(
    (link) => {
      if (link.externalUrl) {
        return {
          href: link.externalUrl,
          openInNewTab: true,
        };
      } else {
        return getKibanaLinkProps({ id: link.id });
      }
    },
    [getKibanaLinkProps]
  );

  return useMemo(
    () =>
      navLinks.reduce<SolutionSideNavItem[]>((items, navLink) => {
        if (navLink.disabled) {
          return items;
        }
        if (isGetStartedNavItem(navLink.id)) {
          items.push(formatGetStartedLink(navLink, getLinkProps));
        } else {
          items.push(formatLink(navLink, getLinkProps));
        }
        return items;
      }, []),
    [getLinkProps, navLinks]
  );
};
