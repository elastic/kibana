/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDataGridToolBarVisibilityOptions } from '@elastic/eui';
import { EcsFieldsResponse } from '@kbn/rule-registry-plugin/common/search_strategy';
import React from 'react';
import { BulkActions } from '../bulk_actions/components/toolbar';

export const getToolbarVisibility = ({
  renderBulkActions,
  alertsCount,
  isAllSelected,
  rowSelection,
  alerts,
}: {
  renderBulkActions?: (isAllSelected: boolean, selectedAlertIds: string[]) => JSX.Element[];
  alertsCount: number;
  isAllSelected: boolean;
  rowSelection: Set<number>;
  alerts: EcsFieldsResponse[];
}): boolean | EuiDataGridToolBarVisibilityOptions => {
  const selectedRowsCount = rowSelection.size;
  if (selectedRowsCount === 0 || selectedRowsCount === undefined || renderBulkActions === undefined)
    return {};

  const selectedAlertIds = Array.from(rowSelection.values()).map(
    (rowIndex: number) => alerts[rowIndex]._id
  );

  const options = {
    showColumnSelector: false,
    showSortSelector: false,
    additionalControls: {
      left: {
        append: (
          <BulkActions
            totalItems={alertsCount}
            bulkActionItems={renderBulkActions(isAllSelected, selectedAlertIds)}
          />
        ),
      },
    },
  };

  return options;
};
