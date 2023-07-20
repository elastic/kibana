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
import type { ViewMode } from '@kbn/embeddable-plugin/public';
import { APP_UI_ID, SecurityPageName } from '../../../common';
import { useGetSecuritySolutionUrl } from '../../common/components/link_to';
import { useNavigateTo } from '../../common/lib/kibana';

const DashboardToolBarComponent = ({
  dashboardContainer,
  onLoad,
  dashboardId,
}: {
  dashboardContainer: DashboardAPI;
  onLoad: (mode: ViewMode) => void;
  dashboardId: string;
}) => {
  const { euiTheme } = useEuiTheme();
  const viewMode = dashboardContainer.select((state) => state.explicitInput.viewMode);

  const { navigateTo } = useNavigateTo();
  const getSecuritySolutionUrl = useGetSecuritySolutionUrl();
  const dashboardListingUrl = useMemo(
    () =>
      `${getSecuritySolutionUrl({
        deepLinkId: SecurityPageName.dashboards,
      })}`,
    [getSecuritySolutionUrl]
  );
  const getEditDashboardUrl = useCallback(
    (id: string) =>
      `${getSecuritySolutionUrl({
        deepLinkId: SecurityPageName.dashboards,
        path: `${id}/edit`,
      })}`,
    [getSecuritySolutionUrl]
  );

  const redirectTo = useCallback(
    (props) => {
      if (props.destination === 'listing') {
        navigateTo({ url: dashboardListingUrl });
      }
      if (props.destination === 'dashboard' && props.id) {
        navigateTo({ url: getEditDashboardUrl(props.id) });
      }
    },
    [dashboardListingUrl, getEditDashboardUrl, navigateTo]
  );

  useEffect(() => {
    onLoad(viewMode);
  }, [onLoad, viewMode]);

  return (
    <DashboardTopNav
      redirectTo={redirectTo}
      dashboardContainer={dashboardContainer}
      embedSettings={{
        forceHideFilterBar: true,
        forceShowTopNavMenu: true,
        forceShowQueryInput: false,
        forceShowDatePicker: false,
        showBorderBottom: false,
        showFullScreenButton: false,
        showBackgroundColor: false,
        showStickyTopNav: false,
        editingToolBarCss: css`
          padding: ${euiTheme.size.s} 0 ${euiTheme.size.s} ${euiTheme.size.s};
        `,
        topNavMenuAlignRight: true,
      }}
      originatingApp={APP_UI_ID}
      originatingPath={`dashboards/${dashboardId}/edit`}
    />
  );
};

export const DashboardToolBar = React.memo(DashboardToolBarComponent);
