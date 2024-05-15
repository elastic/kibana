/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDataGridCellValueElementProps, EuiDataGridControlColumn } from '@elastic/eui';

import { BulkActionsHeader, BulkActionsRowCell } from './components';

export type GetLeadingControlColumn = () => EuiDataGridControlColumn;

export const getLeadingControlColumn: GetLeadingControlColumn = (): EuiDataGridControlColumn => ({
  id: 'bulkActions',
  width: 30,
  headerCellRender: () => {
    return <BulkActionsHeader />;
  },
  rowCellRender: (cveProps: EuiDataGridCellValueElementProps) => {
    const { visibleRowIndex: rowIndex } = cveProps as EuiDataGridCellValueElementProps & {
      visibleRowIndex: number;
    };
    return <BulkActionsRowCell rowIndex={rowIndex} />;
  },
});
