/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import type { DashboardAPI } from '@kbn/dashboard-plugin/public';
import { DashboardTopNav } from '@kbn/dashboard-plugin/public';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import { APP_UI_ID } from '../../../common';
import { useRedirectToDashboardFromLens } from '../../common/components/visualization_actions/use_redirect_to_dashboard_from_lens';

const DashboardToolBarComponent = ({
  dashboardContainer,
  onLoad,
  dashboardId,
}: {
  dashboardContainer: DashboardAPI | undefined;
  onLoad: (mode: ViewMode) => void;
  dashboardId: string | undefined;
}) => {
  const { euiTheme } = useEuiTheme();
  const viewMode =
    dashboardContainer?.select((state) => state.explicitInput.viewMode) ?? ViewMode.VIEW;

  const redirectTo = useRedirectToDashboardFromLens();

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
      topNavMenuAlignRight: true,
    }),
    [euiTheme.size.s]
  );

  return dashboardContainer ? (
    <DashboardTopNav
      redirectTo={redirectTo}
      dashboardContainer={dashboardContainer}
      embedSettings={embedSettings}
      originatingApp={APP_UI_ID}
      originatingPath={dashboardId ? `dashboards/${dashboardId}/edit` : `dashboards/create`}
    />
  ) : null;
};

export const DashboardToolBar = React.memo(DashboardToolBarComponent);
