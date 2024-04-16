/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCheckbox, EuiLoadingSpinner } from '@elastic/eui';
import React, { ChangeEvent, useCallback } from 'react';
import { useContext } from 'react';
import { AlertsTableContext } from '../../contexts/alerts_table_context';
import { BulkActionsVerbs } from '../../../../../types';

const BulkActionsRowCellComponent = ({ rowIndex }: { rowIndex: number }) => {
  const {
    bulkActions: [{ rowSelection }, updateSelectedRows],
  } = useContext(AlertsTableContext);
  const isChecked = rowSelection.has(rowIndex);
  const isLoading = isChecked && rowSelection.get(rowIndex)?.isLoading;
  const onChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (e.target.checked) {
        updateSelectedRows({ action: BulkActionsVerbs.add, rowIndex });
      } else {
        updateSelectedRows({ action: BulkActionsVerbs.delete, rowIndex });
      }
    },
    [rowIndex, updateSelectedRows]
  );
  if (isLoading) {
    return <EuiLoadingSpinner size="m" data-test-subj="row-loader" />;
  }

  // NOTE: id is prefixed here to avoid conflicts with labels in other sections in the app.
  // see https://github.com/elastic/kibana/issues/162837

  return (
    <EuiCheckbox
      id={`bulk-actions-row-cell-${rowIndex}`}
      checked={isChecked}
      onChange={onChange}
      data-test-subj="bulk-actions-row-cell"
    />
  );
};

export const BulkActionsRowCell = React.memo(BulkActionsRowCellComponent);
