/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { SideNavigation } from '@kbn/shared-ux-side-navigation';
import type { SideNavItem } from '@kbn/shared-ux-side-navigation';
import { SecurityPageName } from '../../../../app/types';
import { getAncestorLinksInfo, type NavigationLink } from '../../../links';
import { useRouteSpy } from '../../../utils/route/use_route_spy';
import { useGetSecuritySolutionLinkProps } from '../../links';
import { useShowTimeline } from '../../../utils/timeline/use_show_timeline';
import { useIsPolicySettingsBarVisible } from '../../../../management/pages/policy/view/policy_hooks';
import { bottomNavOffset } from '../../../lib/helpers';
import { track } from '../../../lib/telemetry';
import { useNavLinks } from '../../../links/nav_links';

const isFooterNavItem = (id: SecurityPageName) =>
  id === SecurityPageName.landing || id === SecurityPageName.administration;

type FormatSideNavItems = (navItems: NavigationLink) => SideNavItem;

/**
 * Returns a function to format generic `NavigationLink` array to the `SideNavItem` type
 */
const useFormatSideNavItem = (): FormatSideNavItems => {
  const getSecuritySolutionLinkProps = useGetSecuritySolutionLinkProps(); // adds href and onClick props

  const formatSideNavItem: FormatSideNavItems = useCallback(
    (navLinkItem) => {
      const formatDefaultItem = (navItem: NavigationLink): SideNavItem => ({
        id: navItem.id,
        label: navItem.title,
        ...getSecuritySolutionLinkProps({
          deepLinkId: navItem.id,
        }),
        ...(navItem.categories && navItem.categories.length > 0
          ? { categories: navItem.categories }
          : {}),
        ...(navItem.links && navItem.links.length > 0
          ? {
              items: navItem.links.reduce<SideNavItem[]>((acc, current) => {
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

      const formatGetStartedItem = (navItem: NavigationLink): SideNavItem => ({
        id: navItem.id,
        label: navItem.title.toUpperCase(),
        labelSize: 'xs',
        iconType: 'launch',
        ...getSecuritySolutionLinkProps({
          deepLinkId: navItem.id,
        }),
        appendSeparator: true,
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
  const navLinks = useNavLinks();
  const formatSideNavItem = useFormatSideNavItem();

  const sideNavItems = useMemo(() => {
    const mainNavItems: SideNavItem[] = [];
    const footerNavItems: SideNavItem[] = [];
    navLinks.forEach((navLink) => {
      if (navLink.disabled) {
        return;
      }

      if (isFooterNavItem(navLink.id)) {
        footerNavItems.push(formatSideNavItem(navLink));
      } else {
        mainNavItems.push(formatSideNavItem(navLink));
      }
    });

    return [mainNavItems, footerNavItems];
  }, [navLinks, formatSideNavItem]);

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
    <SideNavigation
      items={items}
      footerItems={footerItems}
      selectedId={selectedId}
      panelBottomOffset={bottomOffset}
      tracker={track}
    />
  );
};
