/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDataGridToolBarVisibilityOptions } from '@elastic/eui';
import React from 'react';
import { BulkActions } from '../bulk_actions/components/toolbar';

export const getToolbarVisibility = ({
  selectedRowsCount,
  alertsCount,
  bulkActionItems,
}: {
  selectedRowsCount: number;
  alertsCount: number;
  bulkActionItems?: JSX.Element[];
}): boolean | EuiDataGridToolBarVisibilityOptions => {
  if (selectedRowsCount === 0 || selectedRowsCount === undefined) return {};

  const options = {
    showColumnSelector: false,
    showSortSelector: false,
    additionalControls: {
      left: {
        append: (
          <BulkActions
            selectedCount={selectedRowsCount}
            totalItems={alertsCount}
            bulkActionItems={bulkActionItems}
          />
        ),
      },
    },
  };

  return options;
};
