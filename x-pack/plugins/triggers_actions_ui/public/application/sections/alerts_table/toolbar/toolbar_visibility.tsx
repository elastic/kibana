/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDataGridToolBarVisibilityOptions } from '@elastic/eui';
import { EcsFieldsResponse } from '@kbn/rule-registry-plugin/common/search_strategy';
import React, { lazy, Suspense } from 'react';
import { BrowserFields } from '@kbn/rule-registry-plugin/common';
import { AlertsCount } from './components/alerts_count/alerts_count';
import { BulkActionsConfig } from '../../../../types';
import { LastUpdatedAt } from './components/last_updated_at';
import { FieldBrowser } from '../../field_browser';

const BulkActionsToolbar = lazy(() => import('../bulk_actions/components/toolbar'));

const getDefaultVisibility = ({
  alertsCount,
  updatedAt,
  columnIds,
  onToggleColumn,
  onResetColumns,
  browserFields,
}: {
  alertsCount: number;
  updatedAt: number;
  columnIds: string[];
  onToggleColumn: (columnId: string) => void;
  onResetColumns: () => void;
  browserFields: BrowserFields;
}): EuiDataGridToolBarVisibilityOptions => {
  const hasBrowserFields = Object.keys(browserFields).length > 0;
  const additionalControls = {
    right: <LastUpdatedAt updatedAt={updatedAt} />,
    left: {
      append: (
        <>
          <AlertsCount count={alertsCount} />
          {hasBrowserFields ? (
            <FieldBrowser
              columnIds={columnIds}
              browserFields={browserFields}
              onResetColumns={onResetColumns}
              onToggleColumn={onToggleColumn}
            />
          ) : undefined}
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
}: {
  bulkActions: BulkActionsConfig[];
  alertsCount: number;
  rowSelection: Map<number, boolean>;
  alerts: EcsFieldsResponse[];
  isLoading: boolean;
  updatedAt: number;
  columnIds: string[];
  onToggleColumn: (columnId: string) => void;
  onResetColumns: () => void;
  browserFields: any;
  setIsBulkActionsLoading: (isLoading: boolean) => void;
}): EuiDataGridToolBarVisibilityOptions => {
  const selectedRowsCount = rowSelection.size;
  const defaultVisibility = getDefaultVisibility({
    alertsCount,
    updatedAt,
    columnIds,
    onToggleColumn,
    onResetColumns,
    browserFields,
  });
  const isBulkActionsActive =
    selectedRowsCount === 0 || selectedRowsCount === undefined || bulkActions.length === 0;

  if (isBulkActionsActive) return defaultVisibility;

  const options = {
    showColumnSelector: false,
    showSortSelector: false,
    additionalControls: {
      right: <LastUpdatedAt updatedAt={updatedAt} />,
      left: {
        append: (
          <>
            <AlertsCount count={alertsCount} />
            <Suspense fallback={null}>
              <BulkActionsToolbar
                totalItems={alertsCount}
                items={bulkActions}
                alerts={alerts}
                setIsBulkActionsLoading={setIsBulkActionsLoading}
              />
            </Suspense>
          </>
        ),
      },
    },
  };

  return options;
};
