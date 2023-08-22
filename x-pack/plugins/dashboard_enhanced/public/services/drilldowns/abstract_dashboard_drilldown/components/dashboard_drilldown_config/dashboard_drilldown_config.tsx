/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';
import {
  withSuspense,
  LazyDashboardDrilldownOptionsComponent,
} from '@kbn/presentation-util-plugin/public';

import { txtChooseDestinationDashboard } from './i18n';
import { DashboardDrilldownConfig as DrilldownConfig } from '../../../../../../common/drilldowns/dashboard_drilldown/types';

const DashboardDrilldownOptions = withSuspense(LazyDashboardDrilldownOptionsComponent, null);

export interface DashboardDrilldownConfigProps {
  error?: string;
  isLoading: boolean;
  config: DrilldownConfig;
  onSearchChange: (searchString: string) => void;
  onDashboardSelect: (dashboardId: string) => void;
  dashboards: Array<EuiComboBoxOptionOption<string>>;
  onConfigChange: (changes: Partial<DrilldownConfig>) => void;
}

export const DashboardDrilldownConfig: React.FC<DashboardDrilldownConfigProps> = ({
  error,
  config,
  dashboards,
  isLoading,
  onConfigChange,
  onSearchChange,
  onDashboardSelect,
}: DashboardDrilldownConfigProps) => {
  const selectedTitle = dashboards.find((item) => item.value === config.dashboardId)?.label || '';

  return (
    <>
      <EuiFormRow label={txtChooseDestinationDashboard} fullWidth isInvalid={!!error} error={error}>
        <EuiComboBox<string>
          async
          fullWidth
          isInvalid={!!error}
          options={dashboards}
          isLoading={isLoading}
          onSearchChange={onSearchChange}
          singleSelection={{ asPlainText: true }}
          data-test-subj={'dashboardDrilldownSelectDashboard'}
          onChange={([{ value = '' } = { value: '' }]) => onDashboardSelect(value)}
          selectedOptions={
            config.dashboardId ? [{ label: selectedTitle, value: config.dashboardId }] : []
          }
        />
      </EuiFormRow>
      <DashboardDrilldownOptions options={config} onOptionChange={onConfigChange} />
    </>
  );
};
