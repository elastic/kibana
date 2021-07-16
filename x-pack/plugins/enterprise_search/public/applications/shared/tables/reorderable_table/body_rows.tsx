/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { BodyRow } from './body_row';

import { Column } from './types';

export interface BodyRowsProps<Item> {
  columns: Array<Column<Item>>;
  items: Item[];
  rowProps?: (item: Item) => object;
}

export const BodyRows = <Item extends object>({
  columns,
  items,
  rowProps = () => ({}),
}: BodyRowsProps<Item>) => {
  return (
    <div>
      {items.map((item, itemIndex) => (
        <BodyRow
          key={`table_draggable_row_${itemIndex}`}
          columns={columns}
          item={item}
          additionalProps={rowProps(item)}
        />
      ))}
    </div>
  );
};
