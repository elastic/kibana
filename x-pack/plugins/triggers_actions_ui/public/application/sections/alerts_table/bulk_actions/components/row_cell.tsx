/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCheckbox } from '@elastic/eui';
import React, { ChangeEvent } from 'react';
import { useContext } from 'react';
import { SelectionContext } from '../context';

export const BulkActionsRowCell = ({ rowIndex }: { rowIndex: string }) => {
  const [{ rowSelection }, updateSelectedRows] = useContext(SelectionContext);
  const isChecked = rowSelection.has(parseInt(rowIndex, 10));

  return (
    <EuiCheckbox
      id={rowIndex}
      checked={isChecked}
      onChange={(e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
          updateSelectedRows({ action: 'add', rowIndex });
        } else {
          updateSelectedRows({ action: 'delete', rowIndex });
        }
      }}
    />
  );
};
