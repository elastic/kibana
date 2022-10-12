/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import { EuiHorizontalRule, EuiListGroupItem, EuiLoadingSpinner } from '@elastic/eui';
import { SecurityPageName } from '../../../../app/types';
import { getAncestorLinksInfo } from '../../../links';
import { useRouteSpy } from '../../../utils/route/use_route_spy';
import { SecuritySolutionLinkAnchor, useGetSecuritySolutionLinkProps } from '../../links';
import { useAppNavLinks } from '../nav_links';
import { SolutionGroupedNav } from '../solution_grouped_nav';
import type {
  CustomSideNavItem,
  DefaultSideNavItem,
  SideNavItem,
} from '../solution_grouped_nav/types';
import type { NavLinkItem } from '../types';
import { EuiIconLaunch } from './icons/launch';
import { useShowTimeline } from '../../../utils/timeline/use_show_timeline';
import { useIsPolicySettingsBarVisible } from '../../../../management/pages/policy/view/policy_hooks';
import { bottomNavOffset } from '../../../lib/helpers';

const isFooterNavItem = (id: SecurityPageName) =>
  id === SecurityPageName.landing || id === SecurityPageName.administration;

type FormatSideNavItems = (navItems: NavLinkItem) => SideNavItem;

/**
 * Renders the navigation item for "Get Started" custom link
 */
const GetStartedCustomLinkComponent: React.FC<{
  isSelected: boolean;
  title: string;
}> = ({ isSelected, title }) => (
  <SecuritySolutionLinkAnchor
    deepLinkId={SecurityPageName.landing}
    color={isSelected ? 'primary' : 'text'}
  >
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
  </SecuritySolutionLinkAnchor>
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
        ...(navItem.categories && navItem.categories.length > 0
          ? { categories: navItem.categories }
          : {}),
        ...(navItem.links && navItem.links.length > 0
          ? {
              items: navItem.links.reduce<DefaultSideNavItem[]>((acc, current) => {
                if (!current.disabled) {
                  acc.push({
                    id: current.id,
                    label: current.title,
                    description: current.description,
                    isBeta: current.isBeta,
                    betaOptions: current.betaOptions,
                    ...getSecuritySolutionLinkProps({ deepLinkId: current.id }),
                  });
                }
                return acc;
              }, []),
            }
          : {}),
      });

      const formatGetStartedItem = (navItem: NavLinkItem): CustomSideNavItem => ({
        id: navItem.id,
        render: (isSelected) => (
          <GetStartedCustomLink isSelected={isSelected} title={navItem.title} />
        ),
      });

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
    const [rootLinkInfo] = getAncestorLinksInfo(pageName);
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

  const isPolicySettingsVisible = useIsPolicySettingsBarVisible();
  const [isTimelineBottomBarVisible] = useShowTimeline();
  const bottomOffset =
    isTimelineBottomBarVisible || isPolicySettingsVisible ? bottomNavOffset : undefined;

  if (items.length === 0 && footerItems.length === 0) {
    return <EuiLoadingSpinner size="m" data-test-subj="sideNavLoader" />;
  }

  return (
    <SolutionGroupedNav
      items={items}
      footerItems={footerItems}
      selectedId={selectedId}
      bottomOffset={bottomOffset}
    />
  );
};
