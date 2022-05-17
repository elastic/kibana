/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, MouseEventHandler } from 'react';
import { EuiHorizontalRule, EuiLink, EuiListGroupItem } from '@elastic/eui';
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

/**
 * Renders the navigation item for "Get Started" custom link
 */
const GetStartedCustomLinkComponent: React.FC<{
  isSelected: boolean;
  title: string;
  href: string;
  onClick: MouseEventHandler;
}> = ({ isSelected, title, href, onClick }) => (
  // eslint-disable-next-line @elastic/eui/href-or-on-click
  <EuiLink href={href} onClick={onClick} color={isSelected ? 'primary' : 'text'}>
    <EuiListGroupItem
      label={title.toUpperCase()}
      size="xs"
      color={isSelected ? 'primary' : 'text'}
      iconType={EuiIconLaunch}
      iconProps={{
        color: isSelected ? 'primary' : 'text',
      }}
    />
    <EuiHorizontalRule margin="xs" />
  </EuiLink>
);
const GetStartedCustomLink = React.memo(GetStartedCustomLinkComponent);

/**
 * Returns a function to format generic `NavLinkItem` array to the `SideNavItem` type
 */
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
        render: (isSelected) => (
          <GetStartedCustomLink
            isSelected={isSelected}
            title={navItem.title}
            {...getSecuritySolutionLinkProps({ deepLinkId: SecurityPageName.landing })}
          />
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

/**
 * Returns the formatted `items` and `footerItems` to be rendered in the navigation
 */
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

/**
 * Main security navigation component.
 * It takes the links to render from the generic application `links` configs.
 */
export const SecuritySideNav: React.FC = () => {
  const [items, footerItems] = useSideNavItems();
  const selectedId = useSelectedId();
  return <SolutionGroupedNav items={items} footerItems={footerItems} selectedId={selectedId} />;
};
