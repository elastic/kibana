/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDataGridCellValueElementProps, EuiDataGridControlColumn } from '@elastic/eui';

import { BulkActionsHeader, BulkActionsRowCell } from './components';

export const getLeadingControlColumn = ({
  pageSize,
}: {
  pageSize: number;
}): EuiDataGridControlColumn => ({
  id: 'bulkActions',
  width: 30,
  headerCellRender: () => {
    return <BulkActionsHeader pageSize={pageSize} />;
  },
  rowCellRender: (cveProps: EuiDataGridCellValueElementProps) => {
    const { visibleRowIndex: rowIndex } = cveProps as EuiDataGridCellValueElementProps & {
      visibleRowIndex: string;
    };
    return <BulkActionsRowCell rowIndex={rowIndex} />;
  },
});
