/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiLoadingSpinner, useEuiTheme } from '@elastic/eui';
import {
  SolutionSideNav,
  SolutionSideNavItemPosition,
  type SolutionSideNavItem,
} from '@kbn/security-solution-side-nav';
import useObservable from 'react-use/lib/useObservable';
import { SecurityPageName } from '../../../../app/types';
import type { SecurityNavLink } from '../../../links';
import { getAncestorLinksInfo } from '../../../links';
import { useRouteSpy } from '../../../utils/route/use_route_spy';
import { useGetSecuritySolutionLinkProps, type GetSecuritySolutionLinkProps } from '../../links';
import { useSecurityInternalNavLinks } from '../../../links/nav_links';
import { useShowTimeline } from '../../../utils/timeline/use_show_timeline';
import { useIsPolicySettingsBarVisible } from '../../../../management/pages/policy/view/policy_hooks';
import { track } from '../../../lib/telemetry';
import { useKibana } from '../../../lib/kibana';
import { CATEGORIES } from './categories';

export const EUI_HEADER_HEIGHT = '93px';
export const BOTTOM_BAR_HEIGHT = '50px';

const getNavItemPosition = (id: SecurityPageName): SolutionSideNavItemPosition =>
  id === SecurityPageName.landing || id === SecurityPageName.administration
    ? SolutionSideNavItemPosition.bottom
    : SolutionSideNavItemPosition.top;

const isGetStartedNavItem = (id: SecurityPageName) => id === SecurityPageName.landing;

/**
 * Formats generic navigation links into the shape expected by the `SolutionSideNav`
 */
const formatLink = (
  navLink: SecurityNavLink,
  getSecuritySolutionLinkProps: GetSecuritySolutionLinkProps
): SolutionSideNavItem => ({
  id: navLink.id,
  label: navLink.title,
  position: getNavItemPosition(navLink.id),
  ...getSecuritySolutionLinkProps({ deepLinkId: navLink.id }),
  ...(navLink.sideNavIcon && { iconType: navLink.sideNavIcon }),
  ...(navLink.categories?.length && { categories: navLink.categories }),
  ...(navLink.links?.length && {
    items: navLink.links.reduce<SolutionSideNavItem[]>((acc, current) => {
      if (!current.disabled) {
        acc.push({
          id: current.id,
          label: current.title,
          iconType: current.sideNavIcon,
          isBeta: current.isBeta,
          betaOptions: current.betaOptions,
          ...getSecuritySolutionLinkProps({ deepLinkId: current.id }),
        });
      }
      return acc;
    }, []),
  }),
});

/**
 * Formats the get started navigation links into the shape expected by the `SolutionSideNav`
 */
const formatGetStartedLink = (
  navLink: SecurityNavLink,
  getSecuritySolutionLinkProps: GetSecuritySolutionLinkProps
): SolutionSideNavItem => ({
  id: navLink.id,
  label: navLink.title,
  iconType: navLink.sideNavIcon,
  position: SolutionSideNavItemPosition.bottom,
  appendSeparator: true,
  ...getSecuritySolutionLinkProps({ deepLinkId: navLink.id }),
});

/**
 * Returns the formatted `items` and `footerItems` to be rendered in the navigation
 */
const useSolutionSideNavItems = () => {
  const navLinks = useSecurityInternalNavLinks();
  const getSecuritySolutionLinkProps = useGetSecuritySolutionLinkProps(); // adds href and onClick props

  const sideNavItems = useMemo(() => {
    if (!navLinks?.length) {
      return undefined;
    }
    return navLinks.reduce<SolutionSideNavItem[]>((navItems, navLink) => {
      if (navLink.disabled) {
        return navItems;
      }

      if (isGetStartedNavItem(navLink.id)) {
        navItems.push(formatGetStartedLink(navLink, getSecuritySolutionLinkProps));
      } else {
        navItems.push(formatLink(navLink, getSecuritySolutionLinkProps));
      }
      return navItems;
    }, []);
  }, [navLinks, getSecuritySolutionLinkProps]);

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

const usePanelTopOffset = (): string | undefined => {
  const {
    chrome: { hasHeaderBanner$ },
  } = useKibana().services;
  const hasHeaderBanner = useObservable(hasHeaderBanner$());
  const { euiTheme } = useEuiTheme();
  return hasHeaderBanner ? `calc(${EUI_HEADER_HEIGHT} + ${euiTheme.size.xl})` : undefined;
};

const usePanelBottomOffset = (): string | undefined => {
  const isPolicySettingsVisible = useIsPolicySettingsBarVisible();
  const [isTimelineBottomBarVisible] = useShowTimeline();
  return isTimelineBottomBarVisible || isPolicySettingsVisible ? BOTTOM_BAR_HEIGHT : undefined;
};

/**
 * Main security navigation component.
 * It takes the links to render from the generic application `links` configs.
 */
export const SecuritySideNav: React.FC<{ onMount?: () => void }> = ({ onMount }) => {
  const items = useSolutionSideNavItems();
  const selectedId = useSelectedId();
  const panelTopOffset = usePanelTopOffset();
  const panelBottomOffset = usePanelBottomOffset();

  if (!items) {
    return <EuiLoadingSpinner size="m" data-test-subj="sideNavLoader" />;
  }

  return (
    <SolutionSideNav
      items={items}
      categories={CATEGORIES}
      onMount={onMount}
      selectedId={selectedId}
      panelTopOffset={panelTopOffset}
      panelBottomOffset={panelBottomOffset}
      tracker={track}
    />
  );
};
