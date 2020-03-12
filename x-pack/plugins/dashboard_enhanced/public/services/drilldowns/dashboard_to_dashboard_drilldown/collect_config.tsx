/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { CollectConfigProps } from './types';
import { DashboardDrilldownConfig } from '../../../components/dashboard_drilldown_config';

export const dashboards = [
  { id: 'dashboard1', title: 'Dashboard 1' },
  { id: 'dashboard2', title: 'Dashboard 2' },
  { id: 'dashboard3', title: 'Dashboard 3' },
];

export const CollectConfig: React.FC<CollectConfigProps> = props => {
  const config = props.config ?? {
    dashboardId: undefined,
    useCurrentDashboardDataRange: true,
    useCurrentDashboardFilters: true,
  };

  return (
    <DashboardDrilldownConfig
      activeDashboardId={config.dashboardId}
      dashboards={dashboards}
      currentFilters={config.useCurrentDashboardFilters}
      keepRange={config.useCurrentDashboardDataRange}
      onDashboardSelect={dashboardId => {
        props.onConfig({ ...config, dashboardId });
      }}
      onCurrentFiltersToggle={() =>
        props.onConfig({
          ...config,
          useCurrentDashboardFilters: !config.useCurrentDashboardFilters,
        })
      }
      onKeepRangeToggle={() =>
        props.onConfig({
          ...config,
          useCurrentDashboardDataRange: !config.useCurrentDashboardDataRange,
        })
      }
    />
  );
};
