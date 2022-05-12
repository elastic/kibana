/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { i18n } from '@kbn/i18n';

import { KibanaPageTemplateProps } from '@kbn/shared-ux-components';
import { PrimaryNavigationProps } from './types';
import { usePrimaryNavigationItems } from './use_navigation_items';
import { SolutionGroupedNav } from '../solution_grouped_nav';
import { useNavItems } from '../solution_grouped_nav/solution_grouped_nav_item';
import { useIsGroupedNavigationEnabled } from '../helpers';

const translatedNavTitle = i18n.translate('xpack.securitySolution.navigation.mainLabel', {
  defaultMessage: 'Security',
});

export const usePrimaryNavigation = ({
  filters,
  query,
  navTabs,
  pageName,
  savedQuery,
  sourcerer,
  tabName,
  timeline,
  timerange,
}: PrimaryNavigationProps): KibanaPageTemplateProps['solutionNav'] => {
  const isGroupedNavigationEnabled = useIsGroupedNavigationEnabled();
  const mapLocationToTab = useCallback(
    (): string => ((tabName && navTabs[tabName]) || navTabs[pageName])?.id ?? '',
    [pageName, tabName, navTabs]
  );

  const [selectedTabId, setSelectedTabId] = useState(mapLocationToTab());

  useEffect(() => {
    const currentTabSelected = mapLocationToTab();

    if (currentTabSelected !== selectedTabId) {
      setSelectedTabId(currentTabSelected);
    }

    // we do need navTabs in case the selectedTabId appears after initial load (ex. checking permissions for anomalies)
  }, [pageName, navTabs, mapLocationToTab, selectedTabId]);

  const navLinkItems = useNavItems();
  const navItems = usePrimaryNavigationItems({
    navTabs,
    selectedTabId,
    filters,
    query,
    savedQuery,
    sourcerer,
    timeline,
    timerange,
  });

  return {
    name: translatedNavTitle,
    icon: 'logoSecurity',
    ...(isGroupedNavigationEnabled
      ? {
          children: <SolutionGroupedNav items={navLinkItems} selectedId={selectedTabId} />,
          closeFlyoutButtonPosition: 'inside',
        }
      : { items: navItems }),
  };
};
