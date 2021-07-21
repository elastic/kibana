/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import classNames from 'classnames';

import './reorderable_table.scss';

import { BodyRow } from './body_row';
import { BodyRows } from './body_rows';
import { Cell } from './cell';
import { DRAGGABLE_UX_STYLE } from './constants';
import { DraggableBodyRow } from './draggable_body_row';
import { DraggableBodyRows } from './draggable_body_rows';
import { HeaderRow } from './header_row';
import { Column } from './types';

interface ReorderableTableProps<Item> {
  columns: Array<Column<Item>>;
  items: Item[];
  className?: string;
  disableDragging?: boolean;
  disableReordering?: boolean;
  onReorder?: (items: Item[], oldItems: Item[]) => void;
  rowProps?: (item: Item) => object;
}

export const ReorderableTable = <Item extends object>({
  columns,
  items,
  className = '',
  disableDragging = false,
  disableReordering = false,

  onReorder = () => undefined,
  rowProps = () => ({}),
}: ReorderableTableProps<Item>) => {
  return (
    <div className={classNames(className, 'reorderableTable')}>
      <HeaderRow
        columns={columns}
        firstCell={!disableReordering ? <Cell {...DRAGGABLE_UX_STYLE} /> : undefined}
      />

      {!disableReordering ? (
        <DraggableBodyRows
          items={items}
          renderItem={(item, itemIndex) => (
            <DraggableBodyRow
              key={`table_draggable_row_${itemIndex}`}
              columns={columns}
              item={item}
              additionalProps={rowProps(item)}
              disableDragging={disableDragging}
              rowIndex={itemIndex}
            />
          )}
          onReorder={onReorder}
        />
      ) : (
        <BodyRows
          items={items}
          renderItem={(item, itemIndex) => (
            <BodyRow
              key={`table_draggable_row_${itemIndex}`}
              columns={columns}
              item={item}
              additionalProps={rowProps(item)}
            />
          )}
        />
      )}
    </div>
  );
};
