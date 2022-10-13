/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiText, EuiToken } from '@elastic/eui';

import { Cell } from './cell';
import { DRAGGABLE_UX_STYLE } from './constants';
import { Column } from './types';

export interface BodyRowProps<Item> {
  columns: Array<Column<Item>>;
  item: Item;
  additionalProps?: object;
  // Cell to put in first column before other columns
  leftAction?: React.ReactNode;
  errors?: string[];
  rowIdentifier?: string;
}

export const BodyRow = <Item extends object>({
  columns,
  item,
  additionalProps,
  leftAction,
  errors = [],
  rowIdentifier,
}: BodyRowProps<Item>) => {
  return (
    <div className="reorderableTableRow">
      <EuiFlexGroup data-test-subj="row" alignItems="center" {...(additionalProps || {})}>
        <EuiFlexItem>
          <EuiFlexGroup alignItems="center">
            {leftAction && <Cell {...DRAGGABLE_UX_STYLE}>{leftAction}</Cell>}
            {rowIdentifier && (
              <Cell {...DRAGGABLE_UX_STYLE} flexBasis="24px">
                <EuiToken
                  size="m"
                  iconType={() => (
                    <EuiText size="xs">
                      <strong>{rowIdentifier}</strong>
                    </EuiText>
                  )}
                />
              </Cell>
            )}
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
      {errors.length > 0 && (
        <EuiFlexGroup direction="column">
          {errors.map((errorMessage, errorMessageIndex) => (
            <EuiFlexItem key={errorMessageIndex}>
              <EuiCallOut iconType="alert" size="s" color="danger" title={errorMessage} />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      )}
    </div>
  );
};
