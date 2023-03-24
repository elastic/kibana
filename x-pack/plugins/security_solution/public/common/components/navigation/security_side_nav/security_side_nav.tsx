/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiLoadingSpinner, useEuiTheme } from '@elastic/eui';
import { SolutionSideNav, type SolutionSideNavItem } from '@kbn/security-solution-side-nav';
import useObservable from 'react-use/lib/useObservable';
import { SecurityPageName } from '../../../../app/types';
import { getAncestorLinksInfo } from '../../../links';
import { useRouteSpy } from '../../../utils/route/use_route_spy';
import { useGetSecuritySolutionLinkProps } from '../../links';
import { useAppNavLinks } from '../nav_links';
import { useShowTimeline } from '../../../utils/timeline/use_show_timeline';
import { useIsPolicySettingsBarVisible } from '../../../../management/pages/policy/view/policy_hooks';
import { track } from '../../../lib/telemetry';
import { useKibana } from '../../../lib/kibana';

export const EUI_HEADER_HEIGHT = '93px';
export const BOTTOM_BAR_HEIGHT = '50px';

const isFooterNavItem = (id: SecurityPageName) =>
  id === SecurityPageName.landing || id === SecurityPageName.administration;
const isGetStartedNavItem = (id: SecurityPageName) => id === SecurityPageName.landing;

/**
 * Returns the formatted `items` and `footerItems` to be rendered in the navigation
 */
const useSolutionSideNavItems = () => {
  const navLinks = useAppNavLinks();
  const getSecuritySolutionLinkProps = useGetSecuritySolutionLinkProps(); // adds href and onClick props

  const sideNavItems = useMemo(() => {
    const mainNavItems: SolutionSideNavItem[] = [];
    const footerNavItems: SolutionSideNavItem[] = [];
    navLinks.forEach((navLink) => {
      if (navLink.disabled) {
        return;
      }

      let sideNavItem: SolutionSideNavItem;
      if (isGetStartedNavItem(navLink.id)) {
        sideNavItem = {
          id: navLink.id,
          label: navLink.title.toUpperCase(),
          labelSize: 'xs',
          iconType: 'launch',
          ...getSecuritySolutionLinkProps({
            deepLinkId: navLink.id,
          }),
          appendSeparator: true,
        };
      } else {
        // generic links
        sideNavItem = {
          id: navLink.id,
          label: navLink.title,
          ...getSecuritySolutionLinkProps({
            deepLinkId: navLink.id,
          }),
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
                  ...getSecuritySolutionLinkProps({ deepLinkId: current.id }),
                });
              }
              return acc;
            }, []),
          }),
        };
      }

      if (isFooterNavItem(navLink.id)) {
        footerNavItems.push(sideNavItem);
      } else {
        mainNavItems.push(sideNavItem);
      }
    });

    return [mainNavItems, footerNavItems];
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
export const SecuritySideNav: React.FC = () => {
  const [items, footerItems] = useSolutionSideNavItems();
  const selectedId = useSelectedId();
  const panelTopOffset = usePanelTopOffset();
  const panelBottomOffset = usePanelBottomOffset();

  if (items.length === 0 && footerItems.length === 0) {
    return <EuiLoadingSpinner size="m" data-test-subj="sideNavLoader" />;
  }

  return (
    <SolutionSideNav
      items={items}
      footerItems={footerItems}
      selectedId={selectedId}
      panelTopOffset={panelTopOffset}
      panelBottomOffset={panelBottomOffset}
      tracker={track}
    />
  );
};
