/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCheckbox } from '@elastic/eui';
import React, { ChangeEvent, useContext } from 'react';
import { SelectionContext } from '../context';

interface BulkActionsHeaderProps {
  rowsCount: number;
}

export const BulkActionsHeader: React.FunctionComponent<BulkActionsHeaderProps> = ({
  rowsCount,
}) => {
  const [{ isAllSelected, isPageSelected }, updateSelectedRows] = useContext(SelectionContext);

  return (
    <EuiCheckbox
      id="selection-toggle"
      aria-label="Select all rows"
      checked={isAllSelected || isPageSelected}
      onChange={(e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
          updateSelectedRows({ action: 'selectCurrentPage', rowsCount });
        } else {
          updateSelectedRows({ action: 'clear' });
        }
      }}
    />
  );
};
