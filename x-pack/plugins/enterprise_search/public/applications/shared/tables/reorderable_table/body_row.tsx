/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { Cell } from './cell';
import { Column } from './types';

interface BodyRowProps<Item> {
  columns: Array<Column<Item>>;
  item: Item;
  additionalProps?: object;
}

export const BodyRow = <Item extends object>({
  columns,
  item,
  additionalProps,
}: BodyRowProps<Item>) => {
  return (
    <div className="reorderable-table-row">
      <EuiFlexGroup data-test-subj="row" alignItems="center" {...(additionalProps || {})}>
        <EuiFlexItem>
          <EuiFlexGroup alignItems="flexStart">
            {columns.map((column, columnIndex) => (
              <Cell
                key={`table_row_cell_${columnIndex}`}
                alignItems={column.alignItems}
                flexBasis={column.flexBasis}
                flexGrow={column.flexGrow}
              >
                {column.render(item)}
              </Cell>
            ))}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
