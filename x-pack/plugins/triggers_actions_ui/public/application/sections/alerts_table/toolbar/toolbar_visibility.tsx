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

const BulkActionsToolbar = lazy(() => import('../bulk_actions/components/toolbar'));

const getDefaultVisibility = (updatedAt: number) => {
  return {
    showColumnSelector: true,
    showSortSelector: true,
    additionalControls: {
      right: <LastUpdatedAt updatedAt={updatedAt} />,
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
}: {
  bulkActions: BulkActionsConfig[];
  alertsCount: number;
  rowSelection: Set<number>;
  alerts: EcsFieldsResponse[];
  isLoading: boolean;
  updatedAt: number;
}): EuiDataGridToolBarVisibilityOptions => {
  const selectedRowsCount = rowSelection.size;
  const defaultVisibility = getDefaultVisibility(updatedAt);

  if (selectedRowsCount === 0 || selectedRowsCount === undefined || bulkActions.length === 0)
    return defaultVisibility;

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
