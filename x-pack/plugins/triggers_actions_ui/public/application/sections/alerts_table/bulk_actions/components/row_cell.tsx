/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCheckbox, EuiLoadingSpinner } from '@elastic/eui';
import React, { ChangeEvent } from 'react';
import { useContext } from 'react';
import { AlertsTableContext } from '../../contexts/alerts_table_context';
import { BulkActionsVerbs } from '../../../../../types';

const BulkActionsRowCellComponent = ({ rowIndex }: { rowIndex: number }) => {
  const {
    bulkActions: [{ rowSelection }, updateSelectedRows],
  } = useContext(AlertsTableContext);
  const isChecked = rowSelection.has(rowIndex);
  const isLoading = isChecked && rowSelection.get(rowIndex)?.isLoading;

  if (isLoading) {
    return <EuiLoadingSpinner size="m" data-test-subj="row-loader" />;
  }

  return (
    <EuiCheckbox
      id={rowIndex.toString()}
      checked={isChecked}
      onChange={(e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
          updateSelectedRows({ action: BulkActionsVerbs.add, rowIndex });
        } else {
          updateSelectedRows({ action: BulkActionsVerbs.delete, rowIndex });
        }
      }}
      data-test-subj="bulk-actions-row-cell"
    />
  );
};

export const BulkActionsRowCell = React.memo(BulkActionsRowCellComponent);
