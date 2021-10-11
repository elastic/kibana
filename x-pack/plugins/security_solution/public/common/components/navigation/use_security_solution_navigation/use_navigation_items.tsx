/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiSideNavItemType } from '@elastic/eui/src/components/side_nav/side_nav_types';

import { securityNavGroup } from '../../../../app/home/home_navigations';
import { getSearch } from '../helpers';
import { PrimaryNavigationItemsProps } from './types';
import { useGetUserCasesPermissions } from '../../../lib/kibana';
import { useNavigation } from '../../../lib/kibana/hooks';
import { NavTab } from '../types';

export const usePrimaryNavigationItems = ({
  navTabs,
  selectedTabId,
  ...urlStateProps
}: PrimaryNavigationItemsProps): Array<EuiSideNavItemType<{}>> => {
  const { navigateTo, getAppUrl } = useNavigation();
  const getSideNav = useCallback(
    (tab: NavTab) => {
      const { id, name, disabled } = tab;
      const isSelected = selectedTabId === id;
      const urlSearch = getSearch(tab, urlStateProps);

      const handleClick = (ev: React.MouseEvent) => {
        ev.preventDefault();
        navigateTo({ deepLinkId: id, path: urlSearch });
      };

      const appHref = getAppUrl({ deepLinkId: id, path: urlSearch });

      return {
        'data-href': appHref,
        'data-test-subj': `navigation-${id}`,
        disabled,
        href: appHref,
        id,
        isSelected,
        name,
        onClick: handleClick,
      };
    },
    [getAppUrl, navigateTo, selectedTabId, urlStateProps]
  );

  const navItemsToDisplay = usePrimaryNavigationItemsToDisplay(navTabs);

  return useMemo(
    () =>
      navItemsToDisplay.map((item) => ({
        ...item,
        items: item.items.map((t: NavTab) => getSideNav(t)),
      })),
    [getSideNav, navItemsToDisplay]
  );
};

function usePrimaryNavigationItemsToDisplay(navTabs: Record<string, NavTab>) {
  const hasCasesReadPermissions = useGetUserCasesPermissions()?.read;
  return useMemo(
    () => [
      {
        id: 'main',
        name: '',
        items: [navTabs.overview],
      },
      {
        ...securityNavGroup.detect,
        items: [navTabs.alerts, navTabs.rules, navTabs.exceptions],
      },
      {
        ...securityNavGroup.explore,
        items: [navTabs.hosts, navTabs.network, ...(navTabs.ueba != null ? [navTabs.ueba] : [])],
      },
      {
        ...securityNavGroup.investigate,
        items: hasCasesReadPermissions ? [navTabs.timelines, navTabs.case] : [navTabs.timelines],
      },
      {
        ...securityNavGroup.manage,
        items: [
          navTabs.endpoints,
          navTabs.trusted_apps,
          navTabs.event_filters,
          navTabs.host_isolation_exceptions,
        ],
      },
    ],
    [navTabs, hasCasesReadPermissions]
  );
}
