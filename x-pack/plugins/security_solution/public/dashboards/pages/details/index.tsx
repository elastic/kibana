/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import { LEGACY_DASHBOARD_APP_ID } from '@kbn/dashboard-plugin/public';
import type { DashboardContainer } from '@kbn/dashboard-plugin/public';

import type { DashboardCapabilities } from '@kbn/dashboard-plugin/common/types';

import { SecurityPageName } from '../../../../common/constants';
import { SpyRoute } from '../../../common/utils/route/spy_routes';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import { useCapabilities } from '../../../common/lib/kibana';
import { DashboardViewPromptState } from '../../hooks/use_dashboard_view_prompt_state';
import { DashboardRenderer } from '../../components/dashboard_renderer';
import { StatusPropmpt } from '../../components/status_prompt';

type DashboardDetails = Record<string, string | undefined>;

const DashboardViewComponent: React.FC = () => {
  const { from, to } = useGlobalTime();

  const { show: canReadDashboard } =
    useCapabilities<DashboardCapabilities>(LEGACY_DASHBOARD_APP_ID);
  const [currentState] = useState<DashboardViewPromptState | null>(
    canReadDashboard ? null : DashboardViewPromptState.NoReadPermission
  );
  const [dashboardDetails, setDashboardDetails] = useState<DashboardDetails>();
  const onDashboardContainerLoaded = useCallback((dashboardContainer: DashboardContainer) => {
    const dashboardTitle = dashboardContainer.getTitle();
    setDashboardDetails({ dashboardTitle });
  }, []);
  return (
    <>
      <DashboardRenderer
        from={from}
        to={to}
        canReadDashboard={canReadDashboard}
        onDashboardContainerLoaded={onDashboardContainerLoaded}
      />
      <StatusPropmpt currentState={currentState} />
      <SpyRoute pageName={SecurityPageName.dashboardView} state={dashboardDetails} />
    </>
  );
};
DashboardViewComponent.displayName = 'DashboardViewComponent';
export const DashboardView = React.memo(DashboardViewComponent);
