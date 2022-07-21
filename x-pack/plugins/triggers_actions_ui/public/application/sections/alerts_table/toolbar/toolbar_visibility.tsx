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

const BulkActionsToolbar = lazy(() => import('../bulk_actions/components/toolbar'));

export const getToolbarVisibility = ({
  bulkActions,
  alertsCount,
  rowSelection,
  alerts,
}: {
  bulkActions: BulkActionsConfig[];
  alertsCount: number;
  rowSelection: Set<number>;
  alerts: EcsFieldsResponse[];
}): EuiDataGridToolBarVisibilityOptions => {
  const selectedRowsCount = rowSelection.size;
  if (selectedRowsCount === 0 || selectedRowsCount === undefined || bulkActions.length === 0)
    return {
      showColumnSelector: true,
      showSortSelector: true,
    };

  const options = {
    showColumnSelector: false,
    showSortSelector: false,
    additionalControls: {
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
