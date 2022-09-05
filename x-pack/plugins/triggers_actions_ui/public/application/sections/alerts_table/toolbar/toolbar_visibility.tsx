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
import { AlertsCount } from './components/alert_count';

const BulkActionsToolbar = lazy(() => import('../bulk_actions/components/toolbar'));

const getDefaultVisibility = ({
  updatedAt,
  alertsCount,
  showAlertCount,
}: {
  updatedAt: number;
  alertsCount: number;
  showAlertCount: boolean;
}) => {
  const additionalControls = {
    right: <LastUpdatedAt updatedAt={updatedAt} />,
    left: showAlertCount
      ? {
          append: <AlertsCount>{alertsCount}</AlertsCount>,
        }
      : undefined,
  };

  return {
    showColumnSelector: true,
    showSortSelector: true,
    additionalControls,
  };
};

export const getToolbarVisibility = ({
  bulkActions,
  alertsCount,
  rowSelection,
  alerts,
  isLoading,
  updatedAt,
  showAlertCount = true,
}: {
  bulkActions: BulkActionsConfig[];
  alertsCount: number;
  rowSelection: Set<number>;
  alerts: EcsFieldsResponse[];
  isLoading: boolean;
  updatedAt: number;
  showAlertCount: boolean;
}): EuiDataGridToolBarVisibilityOptions => {
  const selectedRowsCount = rowSelection.size;
  const defaultVisibility = getDefaultVisibility({ updatedAt, alertsCount, showAlertCount });

  if (selectedRowsCount === 0 || selectedRowsCount === undefined || bulkActions.length === 0)
    return defaultVisibility;

  const options = {
    showColumnSelector: false,
    showSortSelector: false,
    additionalControls: {
      ...defaultVisibility.additionalControls,
      left: {
        append: (
          <>
            <AlertsCount>{alertsCount}</AlertsCount>
            <Suspense fallback={null}>
              <BulkActionsToolbar totalItems={alertsCount} items={bulkActions} alerts={alerts} />
            </Suspense>
          </>
        ),
      },
    },
  };

  return options;
};
