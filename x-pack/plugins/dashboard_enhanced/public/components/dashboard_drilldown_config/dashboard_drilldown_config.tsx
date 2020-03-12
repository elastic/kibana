/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFormRow, EuiSelect, EuiSwitch } from '@elastic/eui';
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
}

export const DashboardDrilldownConfig: React.FC<DashboardDrilldownConfigProps> = ({
  activeDashboardId,
  dashboards,
  currentFilters,
  keepRange,
  onDashboardSelect,
  onCurrentFiltersToggle,
  onKeepRangeToggle,
}) => {
  // TODO: use i18n below.
  return (
    <>
      <EuiFormRow label={txtChooseDestinationDashboard}>
        <EuiSelect
          name="selectDashboard"
          hasNoInitialSelection={true}
          options={dashboards.map(({ id, title }) => ({ value: id, text: title }))}
          value={activeDashboardId}
          onChange={e => onDashboardSelect(e.target.value)}
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
