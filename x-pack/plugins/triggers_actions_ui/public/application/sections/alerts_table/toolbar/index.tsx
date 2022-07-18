/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDataGridToolBarVisibilityOptions } from '@elastic/eui';
import { EcsFieldsResponse } from '@kbn/rule-registry-plugin/common/search_strategy';
import React from 'react';
import { BulkActionsConfig } from '../../../../types';
import { BulkActions } from '../bulk_actions/components/toolbar';

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
  if (selectedRowsCount === 0 || selectedRowsCount === undefined || bulkActions === undefined)
    return {};

  const options = {
    showColumnSelector: false,
    showSortSelector: false,
    additionalControls: {
      left: {
        append: <BulkActions totalItems={alertsCount} items={bulkActions} alerts={alerts} />,
      },
    },
  };

  return options;
};
