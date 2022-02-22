/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiSwitch, EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';
import {
  txtChooseDestinationDashboard,
  txtUseCurrentFilters,
  txtUseCurrentDateRange,
  txtOpenInNewTab,
} from './i18n';

export interface DashboardDrilldownConfigProps {
  activeDashboardId?: string;
  dashboards: Array<EuiComboBoxOptionOption<string>>;
  currentFilters?: boolean;
  keepRange?: boolean;
  openInNewTab?: boolean;
  onDashboardSelect: (dashboardId: string) => void;
  onCurrentFiltersToggle?: () => void;
  onKeepRangeToggle?: () => void;
  onOpenInNewTab?: () => void;
  onSearchChange: (searchString: string) => void;
  isLoading: boolean;
  error?: string;
}

export const DashboardDrilldownConfig: React.FC<DashboardDrilldownConfigProps> = ({
  activeDashboardId,
  dashboards,
  currentFilters,
  keepRange,
  openInNewTab,
  onDashboardSelect,
  onCurrentFiltersToggle,
  onKeepRangeToggle,
  onOpenInNewTab,
  onSearchChange,
  isLoading,
  error,
}: DashboardDrilldownConfigProps) => {
  const selectedTitle = dashboards.find((item) => item.value === activeDashboardId)?.label || '';

  return (
    <>
      <EuiFormRow label={txtChooseDestinationDashboard} fullWidth isInvalid={!!error} error={error}>
        <EuiComboBox<string>
          async
          selectedOptions={
            activeDashboardId ? [{ label: selectedTitle, value: activeDashboardId }] : []
          }
          options={dashboards}
          onChange={([{ value = '' } = { value: '' }]) => onDashboardSelect(value)}
          onSearchChange={onSearchChange}
          isLoading={isLoading}
          singleSelection={{ asPlainText: true }}
          fullWidth
          data-test-subj={'dashboardDrilldownSelectDashboard'}
          isInvalid={!!error}
        />
      </EuiFormRow>
      {!!onCurrentFiltersToggle && (
        <EuiFormRow hasChildLabel={false}>
          <EuiSwitch
            name="useCurrentFilters"
            label={txtUseCurrentFilters}
            checked={!!currentFilters}
            onChange={onCurrentFiltersToggle}
          />
        </EuiFormRow>
      )}
      {!!onKeepRangeToggle && (
        <EuiFormRow hasChildLabel={false}>
          <EuiSwitch
            name="useCurrentDateRange"
            label={txtUseCurrentDateRange}
            checked={!!keepRange}
            onChange={onKeepRangeToggle}
          />
        </EuiFormRow>
      )}
      {!!onOpenInNewTab && (
        <EuiFormRow hasChildLabel={false}>
          <EuiSwitch
            name="openInNewTab"
            label={txtOpenInNewTab}
            checked={!!openInNewTab}
            onChange={onOpenInNewTab}
          />
        </EuiFormRow>
      )}
    </>
  );
};
