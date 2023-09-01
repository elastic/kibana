/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
// import { TopNavMenu, type TopNavMenuProps } from '@kbn/navigation-plugin/public';
import { HeaderMenuPortal } from '@kbn/observability-shared-plugin/public';
import { AppMountParameters } from '@kbn/core-application-browser';
import { EuiBetaBadge, EuiHeaderLink, EuiHeaderLinks } from '@elastic/eui';
import { OBSERVABILITY_LOG_EXPLORER_APP_ID } from '../../common/constants';
import { useKibanaContextForPlugin } from '../utils/use_kibana';
import { betaBadgeDescription, betaBadgeTitle } from '../../common/translations';

interface LogExplorerTopNavMenuProps {
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
  theme$: AppMountParameters['theme$'];
}

export const LogExplorerTopNavMenu = ({
  setHeaderActionMenu,
  theme$,
}: LogExplorerTopNavMenuProps) => {
  const {
    services: { discover },
  } = useKibanaContextForPlugin();

  // const badges = [
  //   {
  //     badgeText: betaBadgeTitle,
  //     toolTipProps: {
  //       title: betaBadgeTitle,
  //       content: betaBadgeDescription,
  //     },
  //   },
  // ];

  // const config = [
  //   {
  //     id: 'discover',
  //     label: 'Discover',
  //     description: 'Discover',
  //     testId: 'discoverProfile',
  //     iconType: 'discoverApp',
  //     run: () => {
  //       discover.locator?.navigate({});
  //     },
  //   },
  // ];

  // return (
  //   <TopNavMenu
  //     appName={OBSERVABILITY_LOG_EXPLORER_APP_ID}
  //     badges={badges}
  //     config={config}
  //     setMenuMountPoint={setMenuMountPoint}
  //   />
  // );
  return (
    <HeaderMenuPortal setHeaderActionMenu={setHeaderActionMenu} theme$={theme$}>
      <EuiHeaderLinks gutterSize="xs">
        <EuiBetaBadge
          label={betaBadgeTitle}
          tooltipContent={betaBadgeDescription}
          alignment="middle"
        />
        <EuiHeaderLink
          onClick={() => discover.locator?.navigate({})}
          color="primary"
          iconType="discoverApp"
        >
          Discover
        </EuiHeaderLink>
      </EuiHeaderLinks>
    </HeaderMenuPortal>
  );
};
