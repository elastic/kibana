/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import classNames from 'classnames';

import { useActions, useValues } from 'kea';

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { ReorderableTable } from '../reorderable_table';

import { EMPTY_ITEM } from './constants';
import { getUpdatedColumns } from './get_updated_columns';
import { getInlineEditableTableLogic } from './inline_editable_table_logic';
import { InlineEditableTableColumn, ItemWithAnID } from './types';

import './inline_editable_tables.scss';

interface InlineEditableTableProps<Item extends ItemWithAnID> {
  columns: Array<InlineEditableTableColumn<Item>>;
  items: Item[];
  instanceId: string;
  title: string;
  addButtonText?: string;
  canRemoveLastItem?: boolean;
  className?: string;
  description?: React.ReactNode;
  isLoading?: boolean;
  lastItemWarning?: string;
  noItemsMessage?: (editNewItem: () => void) => React.ReactNode;
  uneditableItems?: Item[];
}

export const InlineEditableTable = <Item extends ItemWithAnID>({
  columns,
  items,
  instanceId,
  title,
  addButtonText,
  canRemoveLastItem,
  className,
  description,
  isLoading,
  lastItemWarning,
  noItemsMessage = () => null,
  uneditableItems,
  ...rest
}: InlineEditableTableProps<Item>) => {
  const inlineEditableTableLogic = getInlineEditableTableLogic<ItemWithAnID>()({ instanceId });
  const { editingItemId, isEditing, isEditingUnsavedItem } = useValues(inlineEditableTableLogic);
  const { editNewItem, reorderItems } = useActions(inlineEditableTableLogic);

  const isEditingItem = (item: Item) => item.id === editingItemId;
  const isActivelyEditing = (item: Item) => isEditing && isEditingItem(item);

  const displayedItems = isEditingUnsavedItem
    ? uneditableItems
      ? [EMPTY_ITEM, ...items]
      : [...items, EMPTY_ITEM]
    : items;

  const updatedColumns = getUpdatedColumns({
    columns,
    displayedItems, // TODO what is this type error
    instanceId,
    isActivelyEditing,
    canRemoveLastItem,
    isLoading,
    lastItemWarning,
    uneditableItems,
  });

  return (
    <>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h3>{title}</h3>
          </EuiTitle>
          {!!description && (
            <>
              <EuiSpacer size="s" />
              <EuiText
                data-test-subj="description"
                color="subdued"
                size="s"
                className="inlineEditableTable__descriptionText"
              >
                {description}
              </EuiText>
            </>
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            iconType="plusInCircle"
            disabled={isEditing}
            onClick={editNewItem}
            color="success"
            data-test-subj="actionButton"
          >
            {addButtonText ||
              i18n.translate('xpack.enterpriseSearch.inlineEditableTable.newRowButtonLabel', {
                defaultMessage: 'New row',
              })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <ReorderableTable
        className={classNames(className, 'editableTable')}
        // TODO don't cast
        items={displayedItems as Item[]}
        unreorderableItems={uneditableItems}
        columns={updatedColumns}
        rowProps={(item) => ({
          className: classNames({
            'is-being-edited': isActivelyEditing(item),
          }),
        })}
        noItemsMessage={noItemsMessage(editNewItem)}
        onReorder={reorderItems}
        disableDragging={isEditing}
        // TODO don't pass down everything
        {...rest}
      />
    </>
  );
};
