/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFormRow, EuiSelect, EuiSwitch } from '@elastic/eui';
import { CollectConfigProps } from './types';

export const dashboards = [
  { id: 'dashboard1', title: 'Dashboard 1' },
  { id: 'dashboard2', title: 'Dashboard 2' },
];

export const CollectConfig: React.FC<CollectConfigProps> = props => {
  const config = props.config ?? {
    dashboardId: undefined,
    useCurrentDashboardDataRange: true,
    useCurrentDashboardFilters: true,
  };

  // TODO: use i18n below.
  return (
    <>
      <EuiFormRow label="Choose destination dashboard:">
        <EuiSelect
          name="selectDashboard"
          hasNoInitialSelection={true}
          options={dashboards.map(({ id, title }) => ({ value: id, text: title }))}
          value={config.dashboardId}
          onChange={e => {
            props.onConfig({ ...config, dashboardId: e.target.value });
          }}
        />
      </EuiFormRow>
      <EuiFormRow hasChildLabel={false}>
        <EuiSwitch
          name="useCurrentFilters"
          label="Use current dashboard's filters"
          checked={config.useCurrentDashboardFilters}
          onChange={() =>
            props.onConfig({
              ...config,
              useCurrentDashboardFilters: !config.useCurrentDashboardFilters,
            })
          }
        />
      </EuiFormRow>
      <EuiFormRow hasChildLabel={false}>
        <EuiSwitch
          name="useCurrentDateRange"
          label="Use current dashboard's date range"
          checked={config.useCurrentDashboardDataRange}
          onChange={() =>
            props.onConfig({
              ...config,
              useCurrentDashboardDataRange: !config.useCurrentDashboardDataRange,
            })
          }
        />
      </EuiFormRow>
    </>
  );
};
