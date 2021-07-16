/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import classNames from 'classnames';

import './reorderable_table.scss';
import { BodyRows } from './body_rows';
import { HeaderRow } from './header_row';
import { Column } from './types';

interface ReorderableTableProps<Item> {
  className?: string;
  columns: Array<Column<Item>>;
  items: Item[];
}

export const ReorderableTable = <Item extends object>({
  className,
  columns,
  items,
}: ReorderableTableProps<Item>) => {
  return (
    <div className={classNames(className, 'reorderable-table')}>
      <HeaderRow columns={columns} />
      <BodyRows items={items} columns={columns} />
    </div>
  );
};
