/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { i18n } from '@kbn/i18n';

import type { KibanaPageTemplateProps } from '@kbn/shared-ux-page-kibana-template';
import type { PrimaryNavigationProps } from './types';
import { usePrimaryNavigationItems } from './use_navigation_items';
import { useIsGroupedNavigationEnabled } from '../helpers';
import { SecuritySideNav } from '../security_side_nav';

const translatedNavTitle = i18n.translate('xpack.securitySolution.navigation.mainLabel', {
  defaultMessage: 'Security',
});

export const usePrimaryNavigation = ({
  navTabs,
  pageName,
}: PrimaryNavigationProps): KibanaPageTemplateProps['solutionNav'] => {
  const isGroupedNavigationEnabled = useIsGroupedNavigationEnabled();
  const mapLocationToTab = useCallback(
    (): string => navTabs[pageName]?.id ?? '',
    [pageName, navTabs]
  );

  const [selectedTabId, setSelectedTabId] = useState(mapLocationToTab());

  useEffect(() => {
    const currentTabSelected = mapLocationToTab();

    if (currentTabSelected !== selectedTabId) {
      setSelectedTabId(currentTabSelected);
    }

    // we do need navTabs in case the selectedTabId appears after initial load (ex. checking permissions for anomalies)
  }, [pageName, navTabs, mapLocationToTab, selectedTabId]);

  const navItems = usePrimaryNavigationItems({
    navTabs,
    selectedTabId,
  });

  return {
    canBeCollapsed: true,
    name: translatedNavTitle,
    icon: 'logoSecurity',
    ...(isGroupedNavigationEnabled
      ? {
          children: <SecuritySideNav />,
          closeFlyoutButtonPosition: 'inside',
        }
      : { items: navItems }),
  };
};
