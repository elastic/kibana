/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';

import { Cell } from './cell';
import { Column } from './types';

interface HeaderRowProps<Item> {
  columns: Array<Column<Item>>;
  // Cell to put in first column before other columns
  leftAction?: React.ReactNode;
}

export const HeaderRow = <Item extends object>({ columns, leftAction }: HeaderRowProps<Item>) => {
  return (
    <div className="reorderableTableHeader">
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFlexGroup>
            {!!leftAction && leftAction}
            {columns.map((column, columnIndex) => (
              <Cell key={`table_header_cell_${columnIndex}`} {...column}>
                <EuiText size="s">
                  <strong>{column.name}</strong>
                </EuiText>
              </Cell>
            ))}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
