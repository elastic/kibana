/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { EuiCollapsibleNavItemProps } from '@elastic/eui';
import {
  EuiCollapsibleNavBeta,
  EuiCollapsibleNavItem,
  EuiLoadingSpinner,
  useEuiTheme,
} from '@elastic/eui';
import type { SideNavComponent } from '@kbn/core-chrome-browser';
import type { SolutionSideNavItem } from '@kbn/security-solution-side-nav';
import { SolutionSideNav, SolutionSideNavItemPosition } from '@kbn/security-solution-side-nav';
import { useObservable } from 'react-use';
import { css } from '@emotion/react';
import { partition } from 'lodash/fp';
import { useSideNavItems } from './use_side_nav_items';
import { CATEGORIES } from './categories';
import { getProjectPageNameFromNavLinkId } from '../links/util';
import { useKibana } from '../../common/services';
import { SideNavigationFooter } from './side_navigation_footer';

const getEuiNavItemFromSideNavItem = (sideNavItem: SolutionSideNavItem, selectedId: string) => ({
  id: sideNavItem.id,
  title: sideNavItem.label,
  isSelected: sideNavItem.id === selectedId,
  href: sideNavItem.href,
  onClick: sideNavItem.onClick,
});

export const SecuritySideNavigation: SideNavComponent = React.memo(function SecuritySideNavigation({
  activeNodes: [activeChromeNodes],
}) {
  const { chrome } = useKibana().services;
  const { euiTheme } = useEuiTheme();
  const hasHeaderBanner = useObservable(chrome.hasHeaderBanner$());

  /**
   * TODO: Uncomment this when we have the getIsSideNavCollapsed API available
   * const isCollapsed = useObservable(chrome.getIsSideNavCollapsed$());
   */
  const isCollapsed = false;

  const items = useSideNavItems();

  const isLoading = items.length === 0;

  const panelTopOffset = useMemo(
    () =>
      hasHeaderBanner
        ? `calc((${euiTheme.size.l} * 2) + ${euiTheme.size.xl})`
        : `calc(${euiTheme.size.l} * 2)`,
    [hasHeaderBanner, euiTheme]
  );

  const selectedId = useMemo(() => {
    const mainNode = activeChromeNodes?.[0]; // we only care about the first node to highlight a left nav main item
    return mainNode ? getProjectPageNameFromNavLinkId(mainNode.id) : '';
  }, [activeChromeNodes]);

  const bodyStyle = css`
    padding-left: calc(${euiTheme.size.xl} + ${euiTheme.size.s});
    padding-right: ${euiTheme.size.s};
  `;

  const collapsedNavItems = useMemo(() => {
    return CATEGORIES.reduce<EuiCollapsibleNavItemProps[]>((links, category) => {
      const categoryLinks = items.filter((item) => category.linkIds.includes(item.id));
      links.push(...categoryLinks.map((link) => getEuiNavItemFromSideNavItem(link, selectedId)));
      return links;
    }, []);
  }, [items, selectedId]);

  const [bodyItems, footerItems] = useMemo(
    () => partition((item) => item.position === SolutionSideNavItemPosition.top, items),
    [items]
  );

  return isLoading ? (
    <EuiLoadingSpinner size="m" data-test-subj="sideNavLoader" />
  ) : (
    <>
      <EuiCollapsibleNavBeta.Body>
        <EuiCollapsibleNavItem
          title="Security"
          icon="logoSecurity"
          iconProps={{ size: 'm' }}
          data-test-subj="nav-bucket-security"
          items={isCollapsed ? collapsedNavItems : undefined}
        />
        {!isCollapsed && (
          <div css={bodyStyle}>
            <SolutionSideNav
              items={bodyItems}
              categories={CATEGORIES}
              selectedId={selectedId}
              panelTopOffset={panelTopOffset}
            />
          </div>
        )}
      </EuiCollapsibleNavBeta.Body>
      <EuiCollapsibleNavBeta.Footer>
        <SideNavigationFooter selectedId={selectedId} items={footerItems} />
      </EuiCollapsibleNavBeta.Footer>
    </>
  );
});

// eslint-disable-next-line import/no-default-export
export default SecuritySideNavigation;
