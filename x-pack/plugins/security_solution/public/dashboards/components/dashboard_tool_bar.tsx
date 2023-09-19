/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import type { DashboardAPI } from '@kbn/dashboard-plugin/public';
import { DashboardTopNav } from '@kbn/dashboard-plugin/public';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import { ViewMode } from '@kbn/embeddable-plugin/public';

import type { ChromeBreadcrumb } from '@kbn/core/public';
import { SecurityPageName } from '../../../common';
import { useGetSecuritySolutionUrl } from '../../common/components/link_to';
import { useNavigateTo } from '../../common/lib/kibana';

import { APP_NAME } from '../../../common/constants';

const DashboardToolBarComponent = ({
  dashboardContainer,
  onLoad,
}: {
  dashboardContainer: DashboardAPI | undefined;
  onLoad: (mode: ViewMode) => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const viewMode =
    dashboardContainer?.select((state) => state.explicitInput.viewMode) ?? ViewMode.VIEW;

  const { navigateTo } = useNavigateTo();
  const getSecuritySolutionUrl = useGetSecuritySolutionUrl();
  const dashboardListingUrl = useMemo(
    () =>
      `${getSecuritySolutionUrl({
        deepLinkId: SecurityPageName.dashboards,
      })}`,
    [getSecuritySolutionUrl]
  );
  const getEditOrCreateDashboardUrl = useCallback(
    (id: string | undefined) =>
      `${getSecuritySolutionUrl({
        deepLinkId: SecurityPageName.dashboards,
        path: id ? `${id}/edit` : `/create`,
      })}`,
    [getSecuritySolutionUrl]
  );

  const redirectTo = useCallback(
    (props) => {
      if (props.destination === 'listing') {
        navigateTo({ url: dashboardListingUrl });
      }
      if (props.destination === 'dashboard') {
        navigateTo({ url: getEditOrCreateDashboardUrl(props.id) });
      }
    },
    [dashboardListingUrl, getEditOrCreateDashboardUrl, navigateTo]
  );

  const landingBreadcrumb: ChromeBreadcrumb[] = useMemo(
    () => [
      {
        text: APP_NAME,
        href: getSecuritySolutionUrl({ deepLinkId: SecurityPageName.landing }),
      },
    ],
    [getSecuritySolutionUrl]
  );

  useEffect(() => {
    onLoad(viewMode);
  }, [onLoad, viewMode]);

  const embedSettings = useMemo(
    () => ({
      forceHideFilterBar: true,
      forceShowTopNavMenu: true,
      showQueryInput: false,
      forceHideQueryInput: true,
      showDatePicker: false,
      forceHideDatePicker: true,
      showBorderBottom: false,
      showFullScreenButton: false,
      showBackgroundColor: false,
      showStickyTopNav: false,
      editingToolBarCss: css`
        padding: ${euiTheme.size.s} 0 ${euiTheme.size.s} ${euiTheme.size.s};
      `,
    }),
    [euiTheme.size.s]
  );

  return dashboardContainer ? (
    <DashboardTopNav
      customLeadingBreadCrumbs={landingBreadcrumb}
      redirectTo={redirectTo}
      dashboardContainer={dashboardContainer}
      embedSettings={embedSettings}
    />
  ) : null;
};

export const DashboardToolBar = React.memo(DashboardToolBarComponent);
