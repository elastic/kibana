/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext } from 'react';
import { EuiDataGridCellValueElementProps } from '@elastic/eui';
import type { FormatFactory } from '../../types';
import type { DataContextType } from './types';

export const createGridCell = (
  formatters: Record<string, ReturnType<FormatFactory>>,
  DataContext: React.Context<DataContextType>
) => ({ rowIndex, columnId }: EuiDataGridCellValueElementProps) => {
  const { table, alignments } = useContext(DataContext);
  const rowValue = table?.rows[rowIndex][columnId];
  const content = formatters[columnId]?.convert(rowValue, 'html');
  const currentAlignment = alignments && alignments[columnId];
  const alignmentClassName = `lnsTableCell--${currentAlignment}`;

  return (
    <div
      /*
       * dangerouslySetInnerHTML is necessary because the field formatter might produce HTML markup
       * which is produced in a safe way.
       */
      dangerouslySetInnerHTML={{ __html: content }} // eslint-disable-line react/no-danger
      data-test-subj="lnsTableCellContent"
      className={`lnsTableCell ${alignmentClassName}`}
    />
  );
};
