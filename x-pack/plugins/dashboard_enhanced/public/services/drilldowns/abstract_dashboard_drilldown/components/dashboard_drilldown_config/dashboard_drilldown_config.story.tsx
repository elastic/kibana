/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable no-console */

import * as React from 'react';
import { storiesOf } from '@storybook/react';
import { DashboardDrilldownConfig } from './dashboard_drilldown_config';

export const dashboards = [
  { value: 'dashboard1', label: 'Dashboard 1' },
  { value: 'dashboard2', label: 'Dashboard 2' },
  { value: 'dashboard3', label: 'Dashboard 3' },
];

const InteractiveDemo: React.FC = () => {
  const [activeDashboardId, setActiveDashboardId] = React.useState('dashboard1');
  const [currentFilters, setCurrentFilters] = React.useState(false);
  const [keepRange, setKeepRange] = React.useState(false);

  return (
    <DashboardDrilldownConfig
      activeDashboardId={activeDashboardId}
      dashboards={dashboards}
      currentFilters={currentFilters}
      keepRange={keepRange}
      onDashboardSelect={(id) => setActiveDashboardId(id)}
      onCurrentFiltersToggle={() => setCurrentFilters((old) => !old)}
      onKeepRangeToggle={() => setKeepRange((old) => !old)}
      onSearchChange={() => {}}
      isLoading={false}
    />
  );
};

storiesOf(
  'services/drilldowns/dashboard_to_dashboard_drilldown/components/dashboard_drilldown_config',
  module
)
  .add('default', () => (
    <DashboardDrilldownConfig
      activeDashboardId={'dashboard2'}
      dashboards={dashboards}
      onDashboardSelect={(e) => console.log('onDashboardSelect', e)}
      onSearchChange={() => {}}
      isLoading={false}
    />
  ))
  .add('with switches', () => (
    <DashboardDrilldownConfig
      activeDashboardId={'dashboard2'}
      dashboards={dashboards}
      onDashboardSelect={(e) => console.log('onDashboardSelect', e)}
      onCurrentFiltersToggle={() => console.log('onCurrentFiltersToggle')}
      onKeepRangeToggle={() => console.log('onKeepRangeToggle')}
      onSearchChange={() => {}}
      isLoading={false}
    />
  ))
  .add('interactive demo', () => <InteractiveDemo />);
