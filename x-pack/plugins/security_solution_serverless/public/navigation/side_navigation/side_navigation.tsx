/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiLoadingSpinner, useEuiTheme } from '@elastic/eui';
import type { SideNavComponent } from '@kbn/core-chrome-browser';
import { SolutionNav } from '@kbn/shared-ux-page-solution-nav';
import { SolutionSideNav } from '@kbn/security-solution-side-nav';
import { useObservable } from 'react-use';
import { useSideNavItems } from './use_side_nav_items';
import { CATEGORIES } from './categories';
import { getProjectPageNameFromNavLinkId } from '../links/util';
import { useKibana } from '../../common/services';

export const SecuritySideNavigation: SideNavComponent = React.memo(function SecuritySideNavigation({
  activeNodes: [activeChromeNodes],
}) {
  const { hasHeaderBanner$ } = useKibana().services.chrome;
  const { euiTheme } = useEuiTheme();
  const items = useSideNavItems();
  const hasHeaderBanner = useObservable(hasHeaderBanner$());

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

  return isLoading ? (
    <EuiLoadingSpinner size="m" data-test-subj="sideNavLoader" />
  ) : (
    <SolutionNav
      canBeCollapsed={false}
      name={'Security'}
      icon={'logoSecurity'}
      closeFlyoutButtonPosition={'inside'}
      headingProps={{
        'data-test-subj': 'securitySolutionNavHeading',
      }}
    >
      <SolutionSideNav
        items={items}
        categories={CATEGORIES}
        selectedId={selectedId}
        panelTopOffset={panelTopOffset}
      />
    </SolutionNav>
  );
});

// eslint-disable-next-line import/no-default-export
export default SecuritySideNavigation;
