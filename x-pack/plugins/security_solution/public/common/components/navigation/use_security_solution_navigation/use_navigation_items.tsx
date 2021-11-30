/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiSideNavItemType } from '@elastic/eui/src/components/side_nav/side_nav_types';

import { useLocation } from 'react-router-dom';

import { securityNavGroup } from '../../../../app/home/home_navigations';
import { getSearch } from '../helpers';
import { PrimaryNavigationItemsProps } from './types';
import { useKibana } from '../../../lib/kibana/kibana_react';
import { useGetUserCasesPermissions } from '../../../lib/kibana';
import { useNavigation } from '../../../lib/kibana/hooks';
import { NavTab } from '../types';
import { useCanSeeHostIsolationExceptionsMenu } from '../../../../management/pages/host_isolation_exceptions/view/hooks';
import { useIsExperimentalFeatureEnabled } from '../../../hooks/use_experimental_features';

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

const useIsCloudPosture = () => !!useLocation()?.pathname?.includes(CSP_ROOT_PATH);

function usePrimaryNavigationItemsToDisplay(navTabs: Record<string, NavTab>) {
  const hasCasesReadPermissions = useGetUserCasesPermissions()?.read;
  const canSeeHostIsolationExceptions = useCanSeeHostIsolationExceptionsMenu();
  const isPolicyListEnabled = useIsExperimentalFeatureEnabled('policyListEnabled');
  const uiCapabilities = useKibana().services.application.capabilities;

  const isCSP = useIsCloudPosture(); // Temp Hack

  return useMemo(
    () =>
      isCSP
        ? [
            {
              id: 'cloud_posture',
              name: 'Cloud  Posture',
              items: Object.values(navTabs),
            },
          ]
        : uiCapabilities.siem.show
        ? [
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
              items: [
                navTabs.hosts,
                navTabs.network,
                ...(navTabs.ueba != null ? [navTabs.ueba] : []),
              ],
            },
            {
              ...securityNavGroup.investigate,
              items: hasCasesReadPermissions
                ? [navTabs.timelines, navTabs.cases]
                : [navTabs.timelines],
            },
            {
              ...securityNavGroup.manage,
              items: [
                navTabs.endpoints,
                ...(isPolicyListEnabled ? [navTabs.policies] : []),
                navTabs.trusted_apps,
                navTabs.event_filters,
                ...(canSeeHostIsolationExceptions ? [navTabs.host_isolation_exceptions] : []),
              ],
            },
          ]
        : hasCasesReadPermissions
        ? [
            {
              ...securityNavGroup.investigate,
              items: [navTabs.cases],
            },
          ]
        : [],
    [
      uiCapabilities.siem.show,
      navTabs,
      hasCasesReadPermissions,
      canSeeHostIsolationExceptions,
      isPolicyListEnabled,
    ]
  );
}
