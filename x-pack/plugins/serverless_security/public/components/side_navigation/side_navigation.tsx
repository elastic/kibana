/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { SolutionNav } from '@kbn/shared-ux-page-solution-nav';
import { EuiLoadingSpinner } from '@elastic/eui';
import { SideNavigation } from '@kbn/shared-ux-side-navigation';
import { useSideNavItems, useSideNavSelectedId } from '../../hooks/use_side_nav_items';

const translatedNavTitle = i18n.translate('xpack.securitySolution.navigation.mainLabel', {
  defaultMessage: 'Security',
});

export const SecuritySideNavigation: React.FC = () => {
  const [items, footerItems] = useSideNavItems();
  const selectedId = useSideNavSelectedId();

  if (items.length === 0 && footerItems.length === 0) {
    return <EuiLoadingSpinner size="m" data-test-subj="sideNavLoader" />;
  }

  return (
    <SolutionNav
      canBeCollapsed={true}
      isOpenOnDesktop={true}
      name={translatedNavTitle}
      icon={'logoSecurity'}
      children={
        <SideNavigation
          items={items}
          footerItems={footerItems}
          selectedId={selectedId}
          panelBottomOffset={undefined}
        />
      }
      closeFlyoutButtonPosition={'inside'}
    />
  );
};
