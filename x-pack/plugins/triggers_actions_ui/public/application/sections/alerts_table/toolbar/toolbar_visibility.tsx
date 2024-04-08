/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiDataGridToolBarAdditionalControlsOptions,
  EuiDataGridToolBarVisibilityOptions,
} from '@elastic/eui';
import React, { lazy, Suspense } from 'react';
import { BrowserFields } from '@kbn/rule-registry-plugin/common';
import { AlertsCount } from './components/alerts_count/alerts_count';
import type {
  Alerts,
  BulkActionsPanelConfig,
  GetInspectQuery,
  RowSelection,
} from '../../../../types';
import { LastUpdatedAt } from './components/last_updated_at';
import { FieldBrowser } from '../../field_browser';
import { FieldBrowserOptions } from '../../field_browser/types';
import { InspectButton } from './components/inspect';
import { ALERTS_TABLE_TITLE } from '../translations';

const BulkActionsToolbar = lazy(() => import('../bulk_actions/components/toolbar'));

const rightControl = ({
  controls,
  updatedAt,
  getInspectQuery,
  showInspectButton,
}: {
  controls?: EuiDataGridToolBarAdditionalControlsOptions;
  updatedAt: number;
  getInspectQuery: GetInspectQuery;
  showInspectButton: boolean;
}) => {
  return (
    <>
      {showInspectButton && (
        <InspectButton inspectTitle={ALERTS_TABLE_TITLE} getInspectQuery={getInspectQuery} />
      )}
      <LastUpdatedAt updatedAt={updatedAt} />
      {controls?.right}
    </>
  );
};

const getDefaultVisibility = ({
  alertsCount,
  updatedAt,
  columnIds,
  onToggleColumn,
  onResetColumns,
  browserFields,
  controls,
  fieldBrowserOptions,
  getInspectQuery,
  showInspectButton,
}: {
  alertsCount: number;
  updatedAt: number;
  columnIds: string[];
  onToggleColumn: (columnId: string) => void;
  onResetColumns: () => void;
  browserFields: BrowserFields;
  controls?: EuiDataGridToolBarAdditionalControlsOptions;
  fieldBrowserOptions?: FieldBrowserOptions;
  getInspectQuery: GetInspectQuery;
  showInspectButton: boolean;
}): EuiDataGridToolBarVisibilityOptions => {
  const hasBrowserFields = Object.keys(browserFields).length > 0;
  const additionalControls = {
    right: rightControl({ controls, updatedAt, getInspectQuery, showInspectButton }),
    left: {
      append: (
        <>
          <AlertsCount count={alertsCount} />
          {hasBrowserFields && (
            <FieldBrowser
              columnIds={columnIds}
              browserFields={browserFields}
              onResetColumns={onResetColumns}
              onToggleColumn={onToggleColumn}
              options={fieldBrowserOptions}
            />
          )}
        </>
      ),
    },
  };

  return {
    additionalControls,
    showColumnSelector: {
      allowHide: false,
    },
    showSortSelector: true,
  };
};

export const getToolbarVisibility = ({
  bulkActions,
  alertsCount,
  rowSelection,
  alerts,
  isLoading,
  updatedAt,
  columnIds,
  onToggleColumn,
  onResetColumns,
  browserFields,
  setIsBulkActionsLoading,
  clearSelection,
  controls,
  refresh,
  fieldBrowserOptions,
  getInspectQuery,
  showInspectButton,
  toolbarVisibilityProp,
}: {
  bulkActions: BulkActionsPanelConfig[];
  alertsCount: number;
  rowSelection: RowSelection;
  alerts: Alerts;
  isLoading: boolean;
  updatedAt: number;
  columnIds: string[];
  onToggleColumn: (columnId: string) => void;
  onResetColumns: () => void;
  browserFields: any;
  setIsBulkActionsLoading: (isLoading: boolean) => void;
  clearSelection: () => void;
  controls?: EuiDataGridToolBarAdditionalControlsOptions;
  refresh: () => void;
  fieldBrowserOptions?: FieldBrowserOptions;
  getInspectQuery: GetInspectQuery;
  showInspectButton: boolean;
  toolbarVisibilityProp?: EuiDataGridToolBarVisibilityOptions;
}): EuiDataGridToolBarVisibilityOptions => {
  const selectedRowsCount = rowSelection.size;
  const defaultVisibility = getDefaultVisibility({
    alertsCount,
    updatedAt,
    columnIds,
    onToggleColumn,
    onResetColumns,
    browserFields,
    controls,
    fieldBrowserOptions,
    getInspectQuery,
    showInspectButton,
  });
  const isBulkActionsActive =
    selectedRowsCount === 0 || selectedRowsCount === undefined || bulkActions.length === 0;

  if (isBulkActionsActive)
    return {
      ...defaultVisibility,
      ...(toolbarVisibilityProp ?? {}),
    };

  const options = {
    showColumnSelector: false,
    showSortSelector: false,
    additionalControls: {
      right: rightControl({ controls, updatedAt, getInspectQuery, showInspectButton }),
      left: {
        append: (
          <>
            <AlertsCount count={alertsCount} />
            <Suspense fallback={null}>
              <BulkActionsToolbar
                totalItems={alertsCount}
                panels={bulkActions}
                alerts={alerts}
                setIsBulkActionsLoading={setIsBulkActionsLoading}
                clearSelection={clearSelection}
                refresh={refresh}
              />
            </Suspense>
          </>
        ),
      },
    },
    ...(toolbarVisibilityProp ?? {}),
  };

  return options;
};
