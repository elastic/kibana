/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import classNames from 'classnames';

import { useActions, useValues, BindLogic } from 'kea';

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { ReorderableTable } from '../reorderable_table';

import { ItemWithAnID } from '../types';

import { getUpdatedColumns } from './get_updated_columns';
import { InlineEditableTableLogic } from './inline_editable_table_logic';
import { FormErrors, InlineEditableTableColumn } from './types';

import './inline_editable_tables.scss';

export interface InlineEditableTableProps<Item extends ItemWithAnID> {
  columns: Array<InlineEditableTableColumn<Item>>;
  items: Item[];
  defaultItem?: Partial<Item>;
  title: string;
  addButtonText?: string;
  canRemoveLastItem?: boolean;
  className?: string;
  description?: React.ReactNode;
  disableReordering?: boolean;
  isLoading?: boolean;
  lastItemWarning?: string;
  noItemsMessage?: (editNewItem: () => void) => React.ReactNode;
  uneditableItems?: Item[];
  bottomRows?: React.ReactNode[];
  showRowIndex?: boolean;
}

export const InlineEditableTable = <Item extends ItemWithAnID>(
  props: InlineEditableTableProps<Item> & {
    instanceId: string;
    onAdd(item: Item, onSuccess: () => void): void;
    onDelete(item: Item, onSuccess: () => void): void;
    onReorder?(items: Item[], oldItems: Item[], onSuccess: () => void): void;
    onUpdate(item: Item, onSuccess: () => void): void;
    transformItem?(item: Item): Item;
    validateItem?(item: Item): FormErrors;
  }
) => {
  const {
    instanceId,
    columns,
    defaultItem,
    onAdd,
    onDelete,
    onReorder,
    onUpdate,
    transformItem,
    validateItem,
    ...rest
  } = props;
  return (
    <BindLogic
      logic={InlineEditableTableLogic}
      props={{
        instanceId,
        columns,
        defaultItem,
        onAdd,
        onDelete,
        onReorder,
        onUpdate,
        transformItem,
        validateItem,
      }}
    >
      <InlineEditableTableContents {...rest} columns={columns} />
    </BindLogic>
  );
};

export const InlineEditableTableContents = <Item extends ItemWithAnID>({
  columns,
  items,
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
  const { editingItemId, isEditing, isEditingUnsavedItem, rowErrors } =
    useValues(InlineEditableTableLogic);
  const { editNewItem, reorderItems } = useActions(InlineEditableTableLogic);

  // TODO These two things shoud just be selectors
  const isEditingItem = (item: Item) => item.id === editingItemId;
  const isActivelyEditing = (item: Item) => isEditing && isEditingItem(item);

  const emptyItem = { id: null } as Item;
  const displayedItems = isEditingUnsavedItem
    ? uneditableItems
      ? [emptyItem, ...items]
      : [...items, emptyItem]
    : items;

  const updatedColumns = getUpdatedColumns({
    columns,
    displayedItems,
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
          {!!title && (
            <EuiTitle size="xs" data-test-subj="inlineEditableTableTitle">
              <h3>{title}</h3>
            </EuiTitle>
          )}
          {!!description && (
            <>
              <EuiSpacer size="s" />
              <EuiText
                data-test-subj="inlineEditableTableDescription"
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
            data-test-subj="inlineEditableTableActionButton"
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
        items={displayedItems}
        unreorderableItems={uneditableItems}
        columns={updatedColumns}
        rowProps={(item) => ({
          className: classNames({
            'is-being-edited': isActivelyEditing(item),
          }),
        })}
        rowErrors={(item) => (isActivelyEditing(item) ? rowErrors : undefined)}
        noItemsMessage={noItemsMessage(editNewItem)}
        onReorder={reorderItems}
        disableDragging={isEditing}
        {...rest}
      />
    </>
  );
};
