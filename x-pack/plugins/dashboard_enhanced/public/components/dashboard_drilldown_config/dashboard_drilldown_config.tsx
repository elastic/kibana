/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFormRow, EuiSwitch, EuiComboBox } from '@elastic/eui';
import { txtChooseDestinationDashboard } from './i18n';

export interface DashboardItem {
  id: string;
  title: string;
}

export interface DashboardDrilldownConfigProps {
  activeDashboardId?: string;
  dashboards: DashboardItem[];
  currentFilters?: boolean;
  keepRange?: boolean;
  onDashboardSelect: (dashboardId: string) => void;
  onCurrentFiltersToggle?: () => void;
  onKeepRangeToggle?: () => void;
  onSearchChange: (searchString: string) => void;
  isLoading: boolean;
}

export const DashboardDrilldownConfig: React.FC<DashboardDrilldownConfigProps> = ({
  activeDashboardId,
  dashboards,
  currentFilters,
  keepRange,
  onDashboardSelect,
  onCurrentFiltersToggle,
  onKeepRangeToggle,
  onSearchChange,
  isLoading,
}) => {
  // TODO: use i18n below.
  // todo - don't assume selectedTitle is in set
  const selectedTitle = dashboards.find(item => item.id === activeDashboardId)?.title || '';
  return (
    <>
      <EuiFormRow label={txtChooseDestinationDashboard} fullWidth>
        <EuiComboBox<string>
          async
          selectedOptions={
            activeDashboardId ? [{ label: selectedTitle, value: activeDashboardId }] : []
          }
          options={dashboards.map(({ id, title }) => ({ label: title, value: id }))}
          onChange={([{ value = '' } = { value: '' }]) => onDashboardSelect(value)}
          onSearchChange={onSearchChange}
          isLoading={isLoading}
          singleSelection={{ asPlainText: true }}
          fullWidth
        />
      </EuiFormRow>
      {!!onCurrentFiltersToggle && (
        <EuiFormRow hasChildLabel={false}>
          <EuiSwitch
            name="useCurrentFilters"
            label="Use current dashboard's filters"
            checked={!!currentFilters}
            onChange={onCurrentFiltersToggle}
          />
        </EuiFormRow>
      )}
      {!!onKeepRangeToggle && (
        <EuiFormRow hasChildLabel={false}>
          <EuiSwitch
            name="useCurrentDateRange"
            label="Use current dashboard's date range"
            checked={!!keepRange}
            onChange={onKeepRangeToggle}
          />
        </EuiFormRow>
      )}
    </>
  );
};
