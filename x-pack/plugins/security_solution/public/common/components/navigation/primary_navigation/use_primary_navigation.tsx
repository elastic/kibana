/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';
import React, { useEffect, useState, useCallback } from 'react';
import { i18n } from '@kbn/i18n';

import { EuiIcon, EuiSideNavProps } from '@elastic/eui';
import { APP_ID, APP_NAME } from '../../../../../common/constants';
import { PrimaryNavigationProps } from './types';
import { usePrimaryNavigationItems } from './use_navigation_items';

const translatedNavTitle = i18n.translate('xpack.securitySolution.navigation.mainLabel', {
  defaultMessage: APP_NAME,
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
}: PrimaryNavigationProps): EuiSideNavProps<unknown>['items'] => {
  const mapLocationToTab = useCallback(
    (): string =>
      getOr(
        '',
        'id',
        Object.values(navTabs).find(
          (item) =>
            (tabName === item.id && item.pageId != null) ||
            (pageName === item.id && item.pageId == null)
        )
      ),
    [pageName, tabName, navTabs]
  );

  const [selectedTabId, setSelectedTabId] = useState(mapLocationToTab());

  useEffect(() => {
    const currentTabSelected = mapLocationToTab();

    if (currentTabSelected !== selectedTabId) {
      setSelectedTabId(currentTabSelected);
    }

    // we do need navTabs in case the selectedTabId appears after initial load (ex. checking permissions for anomalies)
  }, [pageName, tabName, navTabs, mapLocationToTab, selectedTabId]);

  const topLevelNavItems = usePrimaryNavigationItems({
    filters,
    navTabs,
    query,
    savedQuery,
    selectedTabId,
    sourcerer,
    timeline,
    timerange,
  });

  return [
    {
      name: translatedNavTitle,
      icon: <EuiIcon type="logoSecurity" />,
      id: APP_ID,
      items: topLevelNavItems,
    },
  ];
};
