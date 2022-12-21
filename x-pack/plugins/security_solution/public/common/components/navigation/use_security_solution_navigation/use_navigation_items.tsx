/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import { useCallback, useMemo } from 'react';
import type { EuiSideNavItemType } from '@elastic/eui/src/components/side_nav/side_nav_types';

import { securityNavGroup } from '../../../../app/home/home_navigations';
import { getSearch } from '../helpers';
import type { PrimaryNavigationItemsProps } from './types';
import { useKibana } from '../../../lib/kibana/kibana_react';
import { useGetUserCasesPermissions } from '../../../lib/kibana';
import { useNavigation } from '../../../lib/kibana/hooks';
import type { NavTab } from '../types';
import { SecurityNavGroupKey } from '../types';
import { SecurityPageName } from '../../../../../common/constants';
import { useIsExperimentalFeatureEnabled } from '../../../hooks/use_experimental_features';
import { useGlobalQueryString } from '../../../utils/global_query_string';
import { useUserPrivileges } from '../../user_privileges';

export const usePrimaryNavigationItems = ({
  navTabs,
  selectedTabId,
}: PrimaryNavigationItemsProps): Array<EuiSideNavItemType<{}>> => {
  const { navigateTo, getAppUrl } = useNavigation();
  const globalQueryString = useGlobalQueryString();

  const getSideNav = useCallback(
    (tab: NavTab) => {
      const { id, name, disabled } = tab;
      const isSelected = selectedTabId === id;
      const urlSearch = getSearch(tab.id as SecurityPageName, globalQueryString);

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
    [getAppUrl, navigateTo, selectedTabId, globalQueryString]
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
  const hasCasesReadPermissions = useGetUserCasesPermissions().read;
  const { canReadActionsLogManagement, canReadHostIsolationExceptions } =
    useUserPrivileges().endpointPrivileges;
  const isPolicyListEnabled = useIsExperimentalFeatureEnabled('policyListEnabled');

  const uiCapabilities = useKibana().services.application.capabilities;
  return useMemo(
    () =>
      uiCapabilities.siem.show
        ? [
            {
              id: 'main',
              name: '',
              items: [navTabs[SecurityPageName.landing]],
            },
            {
              ...securityNavGroup[SecurityNavGroupKey.dashboards],
              items: [
                navTabs[SecurityPageName.overview],
                navTabs[SecurityPageName.detectionAndResponse],
                navTabs[SecurityPageName.cloudSecurityPostureDashboard],
                navTabs[SecurityPageName.entityAnalytics],
                ...(navTabs[SecurityPageName.kubernetes] != null
                  ? [navTabs[SecurityPageName.kubernetes]]
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
              ...securityNavGroup[SecurityNavGroupKey.findings],
              items: [navTabs[SecurityPageName.cloudSecurityPostureFindings]],
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
              ...securityNavGroup[SecurityNavGroupKey.intelligence],
              items: [navTabs[SecurityPageName.threatIntelligenceIndicators]],
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
                // TODO: also hide other management pages based on authz privileges
                navTabs[SecurityPageName.endpoints],
                ...(isPolicyListEnabled ? [navTabs[SecurityPageName.policies]] : []),
                navTabs[SecurityPageName.trustedApps],
                navTabs[SecurityPageName.eventFilters],
                ...(canReadHostIsolationExceptions
                  ? [navTabs[SecurityPageName.hostIsolationExceptions]]
                  : []),
                navTabs[SecurityPageName.blocklist],
                ...(canReadActionsLogManagement
                  ? [navTabs[SecurityPageName.responseActionsHistory]]
                  : []),
                navTabs[SecurityPageName.cloudSecurityPostureBenchmarks],
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
      canReadHostIsolationExceptions,
      canReadActionsLogManagement,
      isPolicyListEnabled,
    ]
  );
}
