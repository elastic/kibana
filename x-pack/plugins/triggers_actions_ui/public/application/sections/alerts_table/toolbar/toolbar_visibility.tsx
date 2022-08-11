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
import browserFields from './browserFields';

const BulkActionsToolbar = lazy(() => import('../bulk_actions/components/toolbar'));

const getDefaultVisibility = (
  updatedAt: number,
  columnIds: string[]
): EuiDataGridToolBarVisibilityOptions => {
  console.log('columnIds', columnIds);
  const fieldBrowserProps: FieldBrowserProps = {
    columnIds,
    browserFields,
    onResetColumns: () => console.log('reset columns clicked'),
    onToggleColumn: () => console.log('onToggleColumn clicked'),
    options: {},
  };

  return {
    showColumnSelector: true,
    showSortSelector: true,
    additionalControls: {
      right: <LastUpdatedAt updatedAt={updatedAt} />,
      left: {
        append: <FieldBrowser {...fieldBrowserProps} />,
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
}: {
  bulkActions: BulkActionsConfig[];
  alertsCount: number;
  rowSelection: Set<number>;
  alerts: EcsFieldsResponse[];
  isLoading: boolean;
  updatedAt: number;
  columnIds: string[];
}): EuiDataGridToolBarVisibilityOptions => {
  const selectedRowsCount = rowSelection.size;
  const defaultVisibility = getDefaultVisibility(updatedAt, columnIds);
  const isBulkActionsActive =
    selectedRowsCount === 0 || selectedRowsCount === undefined || bulkActions.length === 0;

  if (isBulkActionsActive) return defaultVisibility;

  const options = {
    showColumnSelector: false,
    showSortSelector: false,
    additionalControls: {
      ...defaultVisibility.additionalControls,
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
