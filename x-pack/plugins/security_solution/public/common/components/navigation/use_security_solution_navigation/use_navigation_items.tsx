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
import { useKibana } from '../../../lib/kibana/kibana_react';
import { useGetUserCasesPermissions } from '../../../lib/kibana';
import { useNavigation } from '../../../lib/kibana/hooks';
import { NavTab, SecurityNavGroupKey } from '../types';
import { SecurityPageName } from '../../../../../common/constants';
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

function usePrimaryNavigationItemsToDisplay(navTabs: Record<string, NavTab>) {
  const hasCasesReadPermissions = useGetUserCasesPermissions()?.read;
  const canSeeHostIsolationExceptions = useCanSeeHostIsolationExceptionsMenu();
  const isPolicyListEnabled = useIsExperimentalFeatureEnabled('policyListEnabled');
  const uiCapabilities = useKibana().services.application.capabilities;
  return useMemo(
    () =>
      uiCapabilities.siem.show
        ? [
            {
              id: 'main',
              name: '',
              items: [
                navTabs[SecurityPageName.overview],
                navTabs[SecurityPageName.landing],
                // Temporary check for detectionAndResponse while page is feature flagged
                ...(navTabs[SecurityPageName.detectionAndResponse] != null
                  ? [navTabs[SecurityPageName.detectionAndResponse]]
                  : []),
              ],
            },
            {
              ...securityNavGroup[SecurityNavGroupKey.detect],
              items: [
                navTabs[SecurityPageName.alerts],
                navTabs[SecurityPageName.rules],
                navTabs[SecurityPageName.exceptions],
              ],
            },
            {
              ...securityNavGroup[SecurityNavGroupKey.explore],
              items: [
                navTabs[SecurityPageName.hosts],
                navTabs[SecurityPageName.network],
                ...(navTabs[SecurityPageName.users] != null
                  ? [navTabs[SecurityPageName.users]]
                  : []),
              ],
            },
            {
              ...securityNavGroup[SecurityNavGroupKey.investigate],
              items: hasCasesReadPermissions
                ? [navTabs[SecurityPageName.timelines], navTabs[SecurityPageName.case]]
                : [navTabs[SecurityPageName.timelines]],
            },
            {
              ...securityNavGroup[SecurityNavGroupKey.manage],
              items: [
                navTabs[SecurityPageName.endpoints],
                ...(isPolicyListEnabled ? [navTabs[SecurityPageName.policies]] : []),
                navTabs[SecurityPageName.trustedApps],
                navTabs[SecurityPageName.eventFilters],
                ...(canSeeHostIsolationExceptions
                  ? [navTabs[SecurityPageName.hostIsolationExceptions]]
                  : []),
                navTabs[SecurityPageName.blocklist],
              ],
            },
          ]
        : hasCasesReadPermissions
        ? [
            {
              ...securityNavGroup[SecurityNavGroupKey.investigate],
              items: [navTabs[SecurityPageName.case]],
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
