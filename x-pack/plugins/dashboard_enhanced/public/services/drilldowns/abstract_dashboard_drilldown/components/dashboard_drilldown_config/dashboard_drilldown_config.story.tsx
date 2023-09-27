/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */

import * as React from 'react';
import { storiesOf } from '@storybook/react';
import {
  DashboardDrilldownOptions,
  DEFAULT_DASHBOARD_DRILLDOWN_OPTIONS,
} from '@kbn/presentation-util-plugin/public';

import { DashboardDrilldownConfig } from './dashboard_drilldown_config';

export const dashboards = [
  { value: 'dashboard1', label: 'Dashboard 1' },
  { value: 'dashboard2', label: 'Dashboard 2' },
  { value: 'dashboard3', label: 'Dashboard 3' },
];

const InteractiveDemo: React.FC = () => {
  const [activeDashboardId, setActiveDashboardId] = React.useState('dashboard1');
  const [options, setOptions] = React.useState<DashboardDrilldownOptions>(
    DEFAULT_DASHBOARD_DRILLDOWN_OPTIONS
  );
  // const [currentFilters, setCurrentFilters] = React.useState(false);
  // const [keepRange, setKeepRange] = React.useState(false);

  return (
    <DashboardDrilldownConfig
      dashboards={dashboards}
      config={{ dashboardId: activeDashboardId, ...options }}
      onConfigChange={(changes) => {
        if (changes.dashboardId) {
          setActiveDashboardId(changes.dashboardId);
          delete changes.dashboardId;
        }
        setOptions({ ...options, ...changes });
      }}
      onDashboardSelect={(id) => setActiveDashboardId(id)}
      onSearchChange={() => {}}
      isLoading={false}
    />
  );
};

storiesOf(
  'services/drilldowns/dashboard_to_dashboard_drilldown/components/dashboard_drilldown_config',
  module
)
  .add('with switches', () => (
    <DashboardDrilldownConfig
      dashboards={dashboards}
      config={{ dashboardId: 'dashboard2', ...DEFAULT_DASHBOARD_DRILLDOWN_OPTIONS }}
      onDashboardSelect={(e) => console.log('onDashboardSelect', e)}
      onSearchChange={() => {}}
      onConfigChange={(e) => console.log('onConfigChange', e)}
      isLoading={false}
    />
  ))
  .add('interactive demo', () => <InteractiveDemo />);
