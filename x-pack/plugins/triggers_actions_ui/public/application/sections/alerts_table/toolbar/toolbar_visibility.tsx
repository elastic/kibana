/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDataGridToolBarVisibilityOptions } from '@elastic/eui';
import { EcsFieldsResponse } from '@kbn/rule-registry-plugin/common/search_strategy';
import React, { lazy, Suspense } from 'react';
import { BulkActionsConfig } from '../../../../types';
import { LastUpdatedAt } from './components/last_updated_at';
import { FieldBrowser, FieldBrowserProps } from '../../field_browser';

const BulkActionsToolbar = lazy(() => import('../bulk_actions/components/toolbar'));

const getDefaultVisibility = (
  updatedAt: number,
  columnIds: string[],
  onToggleColumn: (columnId: string) => void,
  onResetColumns: () => void,
  browserFields: any
): EuiDataGridToolBarVisibilityOptions => {
  const fieldBrowserProps: FieldBrowserProps = {
    columnIds,
    browserFields,
    onResetColumns,
    onToggleColumn,
    options: {},
  };

  const hasBrowserFields = Object.keys(fieldBrowserProps.browserFields).length > 0;

  return {
    showColumnSelector: true,
    showSortSelector: true,
    additionalControls: {
      right: <LastUpdatedAt updatedAt={updatedAt} />,
      left: {
        append: hasBrowserFields ? <FieldBrowser {...fieldBrowserProps} /> : undefined,
      },
    },
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
}): EuiDataGridToolBarVisibilityOptions => {
  const selectedRowsCount = rowSelection.size;
  const defaultVisibility = getDefaultVisibility(
    updatedAt,
    columnIds,
    onToggleColumn,
    onResetColumns,
    browserFields
  );
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
          <Suspense fallback={null}>
            <BulkActionsToolbar totalItems={alertsCount} items={bulkActions} alerts={alerts} />
          </Suspense>
        ),
      },
    },
  };

  return options;
};
