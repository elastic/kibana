/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCheckbox } from '@elastic/eui';
import React, { ChangeEvent, useContext } from 'react';
import { BulkActionsVerbs } from '../../../../../types';
import { BulkActionsContext } from '../context';

const BulkActionsHeaderComponent: React.FunctionComponent = () => {
  const [{ isAllSelected, areAllVisibleRowsSelected }, updateSelectedRows] =
    useContext(BulkActionsContext);

  return (
    <EuiCheckbox
      id="selection-toggle"
      aria-label="Select all rows"
      checked={isAllSelected || areAllVisibleRowsSelected}
      onChange={(e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
          updateSelectedRows({ action: BulkActionsVerbs.selectCurrentPage });
        } else {
          updateSelectedRows({ action: BulkActionsVerbs.clear });
        }
      }}
      data-test-subj="bulk-actions-header"
    />
  );
};

export const BulkActionsHeader = React.memo(BulkActionsHeaderComponent);
