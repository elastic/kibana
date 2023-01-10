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
import { EcsFieldsResponse } from '@kbn/rule-registry-plugin/common/search_strategy';
import React, { Fragment, lazy, Suspense } from 'react';
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
  additionalControls,
}: {
  alertsCount: number;
  updatedAt: number;
  columnIds: string[];
  onToggleColumn: (columnId: string) => void;
  onResetColumns: () => void;
  browserFields: BrowserFields;
  additionalControls?: EuiDataGridToolBarAdditionalControlsOptions;
}): EuiDataGridToolBarVisibilityOptions => {
  const hasBrowserFields = Object.keys(browserFields).length > 0;
  const localAdditionalControls = {
    right: (
      <Fragment>
        <LastUpdatedAt updatedAt={updatedAt} />
        {additionalControls?.right ? additionalControls.right : null}
      </Fragment>
    ),
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
          {additionalControls?.left ? additionalControls.left : null}
        </>
      ),
    },
  };

  return {
    additionalControls: localAdditionalControls,
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
  additionalControls,
  refresh,
}: {
  bulkActions: BulkActionsConfig[];
  alertsCount: number;
  rowSelection: Set<number>;
  alerts: EcsFieldsResponse[];
  isLoading: boolean;
  updatedAt: number;
  columnIds: string[];
  onToggleColumn: (columnId: string) => void;
  onResetColumns: () => void;
  browserFields: any;
  additionalControls?: EuiDataGridToolBarAdditionalControlsOptions;
  refresh: () => void;
}): EuiDataGridToolBarVisibilityOptions => {
  const selectedRowsCount = rowSelection.size;
  const defaultVisibility = getDefaultVisibility({
    alertsCount,
    updatedAt,
    columnIds,
    onToggleColumn,
    onResetColumns,
    browserFields,
    additionalControls,
  });
  const isBulkActionsActive =
    selectedRowsCount === 0 || selectedRowsCount === undefined || bulkActions.length === 0;

  if (isBulkActionsActive) return defaultVisibility;

  const options = {
    showColumnSelector: false,
    showSortSelector: false,
    additionalControls: {
      right: (
        <div className="right-controls">
          <LastUpdatedAt updatedAt={updatedAt} />
          {additionalControls?.right ? additionalControls.right : null}
        </div>
      ),
      left: {
        append: (
          <>
            <AlertsCount count={alertsCount} />
            <Suspense fallback={null}>
              <BulkActionsToolbar
                totalItems={alertsCount}
                items={bulkActions}
                alerts={alerts}
                refresh={refresh}
              />
            </Suspense>
            {additionalControls?.left ? additionalControls.left : null}
          </>
        ),
      },
    },
  };

  return options;
};
