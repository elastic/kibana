/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect } from 'react';
import { CollectConfigProps } from './types';
import { DashboardDrilldownConfig } from '../../../components/dashboard_drilldown_config';
import { Params } from './drilldown';

export interface CollectConfigContainerProps extends CollectConfigProps {
  params: Params;
}

export const CollectConfigContainer: React.FC<CollectConfigContainerProps> = ({
  config,
  onConfig,
  params: { savedObjects },
}) => {
  const [dashboards] = useState([
    { id: 'dashboard1', title: 'Dashboard 1' },
    { id: 'dashboard2', title: 'Dashboard 2' },
    { id: 'dashboard3', title: 'Dashboard 3' },
    { id: 'dashboard4', title: 'Dashboard 4' },
  ]);

  useEffect(() => {
    // TODO: Load dashboards...
  }, [savedObjects]);

  return (
    <DashboardDrilldownConfig
      activeDashboardId={config.dashboardId}
      dashboards={dashboards}
      currentFilters={config.useCurrentDashboardFilters}
      keepRange={config.useCurrentDashboardDataRange}
      onDashboardSelect={dashboardId => {
        onConfig({ ...config, dashboardId });
      }}
      onCurrentFiltersToggle={() =>
        onConfig({
          ...config,
          useCurrentDashboardFilters: !config.useCurrentDashboardFilters,
        })
      }
      onKeepRangeToggle={() =>
        onConfig({
          ...config,
          useCurrentDashboardDataRange: !config.useCurrentDashboardDataRange,
        })
      }
    />
  );
};
