/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { Column } from '../reorderable_table/types';

import { ActionColumn } from './action_column';
import { EditingColumn } from './editing_column';
import { ItemWithAnID, InlineEditableTableColumn } from './types';

interface GetUpdatedColumnProps<Item extends ItemWithAnID> {
  columns: Array<InlineEditableTableColumn<Item>>;
  displayedItems: Item[];
  instanceId: string;
  isActivelyEditing: (item: Item) => boolean;
  canRemoveLastItem?: boolean;
  isLoading?: boolean;
  lastItemWarning?: string;
  uneditableItems?: Item[];
}

export const getUpdatedColumns = <Item extends ItemWithAnID>({
  columns,
  displayedItems,
  instanceId,
  // TODO v
  isActivelyEditing,
  canRemoveLastItem,
  isLoading = false,
  lastItemWarning,
  uneditableItems,
}: GetUpdatedColumnProps<Item>): Array<Column<Item>> => {
  return [
    // TODO
    ...columns.map((column) => {
      const newColumn: Column<Item> = {
        name: column.name,
        // TODO render: (value, item: Item) => {
        render: (item: Item) => {
          if (isActivelyEditing(item)) {
            return <EditingColumn column={column} instanceId={instanceId} isLoading={isLoading} />;
          }
          // TODO return column.render(value, item);
          return column.render(item);
        },
      };
      return newColumn;
    }),
    {
      flexBasis: '200px',
      flexGrow: 0,
      render: (item: Item) => (
        <ActionColumn
          displayedItems={displayedItems}
          instanceId={instanceId}
          isLoading={isLoading} // TODO This should be consistently optional or not optional
          canRemoveLastItem={canRemoveLastItem}
          lastItemWarning={lastItemWarning}
          uneditableItems={uneditableItems}
          item={item}
        />
      ),
    },
  ];
};
