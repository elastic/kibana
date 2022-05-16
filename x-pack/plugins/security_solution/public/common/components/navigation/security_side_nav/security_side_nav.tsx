/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import { EuiLink, EuiListGroupItem } from '@elastic/eui';
import { SecurityPageName } from '../../../../app/types';
import { navigationCategories as managementCategories } from '../../../../management/links';
import { getAncestorLinksInfo } from '../../../links';
import { useRouteSpy } from '../../../utils/route/use_route_spy';
import { useGetSecuritySolutionLinkProps } from '../../links';
import { useAppNavLinks } from '../nav_links';
import { SolutionGroupedNav } from '../solution_grouped_nav';
import { CustomSideNavItem, DefaultSideNavItem, SideNavItem } from '../solution_grouped_nav/types';
import { NavLinkItem } from '../types';
import { EuiIconLaunch } from './icons/launch';

const isFooterNavItem = (id: SecurityPageName) =>
  id === SecurityPageName.landing || id === SecurityPageName.administration;

type FormatSideNavItems = (navItems: NavLinkItem) => SideNavItem;

const useFormatSideNavItem = (): FormatSideNavItems => {
  const getSecuritySolutionLinkProps = useGetSecuritySolutionLinkProps(); // adds href and onClick props

  const formatSideNavItem: FormatSideNavItems = useCallback(
    (navLinkItem) => {
      const formatDefaultItem = (navItem: NavLinkItem): DefaultSideNavItem => ({
        id: navItem.id,
        label: navItem.title,
        ...getSecuritySolutionLinkProps({ deepLinkId: navItem.id }),
        ...(navItem.links && navItem.links.length > 0
          ? {
              items: navItem.links
                .filter((link) => !link.disabled)
                .map((panelNavItem) => ({
                  id: panelNavItem.id,
                  label: panelNavItem.title,
                  description: panelNavItem.description,
                  ...getSecuritySolutionLinkProps({ deepLinkId: panelNavItem.id }),
                })),
            }
          : {}),
      });

      const formatManagementItem = (navItem: NavLinkItem): DefaultSideNavItem => ({
        ...formatDefaultItem(navItem),
        categories: managementCategories,
      });

      const formatGetStartedItem = (navItem: NavLinkItem): CustomSideNavItem => ({
        id: navItem.id,
        render: () => (
          <EuiLink {...getSecuritySolutionLinkProps({ deepLinkId: SecurityPageName.landing })}>
            <EuiListGroupItem label="GET STARTED" size="xs" color="text" iconType={EuiIconLaunch} />
          </EuiLink>
        ),
      });

      if (navLinkItem.id === SecurityPageName.administration) {
        return formatManagementItem(navLinkItem);
      }
      if (navLinkItem.id === SecurityPageName.landing) {
        return formatGetStartedItem(navLinkItem);
      }
      return formatDefaultItem(navLinkItem);
    },
    [getSecuritySolutionLinkProps]
  );

  return formatSideNavItem;
};

const useSideNavItems = () => {
  const appNavLinks = useAppNavLinks();
  const formatSideNavItem = useFormatSideNavItem();

  const sideNavItems = useMemo(() => {
    const mainNavItems: SideNavItem[] = [];
    const footerNavItems: SideNavItem[] = [];
    appNavLinks.forEach((appNavLink) => {
      if (appNavLink.disabled) {
        return;
      }
      if (isFooterNavItem(appNavLink.id)) {
        footerNavItems.push(formatSideNavItem(appNavLink));
      } else {
        mainNavItems.push(formatSideNavItem(appNavLink));
      }
    });
    return [mainNavItems, footerNavItems];
  }, [appNavLinks, formatSideNavItem]);

  return sideNavItems;
};

const useSelectedId = (): SecurityPageName => {
  const [{ pageName }] = useRouteSpy();

  const selectedId = useMemo(() => {
    const [rootLinkInfo] = getAncestorLinksInfo(pageName as SecurityPageName);
    return rootLinkInfo?.id ?? '';
  }, [pageName]);

  return selectedId;
};

const SecuritySideNavComponent: React.FC = () => {
  const [items, footerItems] = useSideNavItems();
  const selectedId = useSelectedId();
  return <SolutionGroupedNav items={items} footerItems={footerItems} selectedId={selectedId} />;
};
SecuritySideNavComponent.displayName = 'SecuritySideNavComponent';

export const SecuritySideNav = SecuritySideNavComponent;
