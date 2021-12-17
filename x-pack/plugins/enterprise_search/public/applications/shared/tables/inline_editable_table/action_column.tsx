/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';

import {
  CANCEL_BUTTON_LABEL,
  DELETE_BUTTON_LABEL,
  EDIT_BUTTON_LABEL,
  SAVE_BUTTON_LABEL,
} from '../../constants';

import { ItemWithAnID } from '../types';

import { InlineEditableTableLogic } from './inline_editable_table_logic';

interface ActionColumnProps<Item extends ItemWithAnID> {
  displayedItems: Item[];
  isActivelyEditing: (i: Item) => boolean;
  isLoading?: boolean;
  item: Item;
  canRemoveLastItem?: boolean;
  lastItemWarning?: string;
  uneditableItems?: Item[];
}

export const ActionColumn = <Item extends ItemWithAnID>({
  displayedItems,
  isActivelyEditing,
  isLoading = false,
  item,
  canRemoveLastItem,
  lastItemWarning,
  uneditableItems,
}: ActionColumnProps<Item>) => {
  const { doesEditingItemValueContainEmptyProperty, fieldErrors, rowErrors, isEditingUnsavedItem } =
    useValues(InlineEditableTableLogic);
  const { editExistingItem, deleteItem, doneEditing, saveExistingItem, saveNewItem } =
    useActions(InlineEditableTableLogic);

  if (uneditableItems?.includes(item)) {
    return null;
  }

  const isInvalid = Object.keys(fieldErrors).length > 0 || rowErrors.length > 0;

  if (isActivelyEditing(item)) {
    return (
      <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
        <EuiFlexItem>
          <EuiButtonEmpty
            data-test-subj="saveButton"
            color="primary"
            iconType="checkInCircleFilled"
            onClick={isEditingUnsavedItem ? saveNewItem : saveExistingItem}
            disabled={isLoading || isInvalid || doesEditingItemValueContainEmptyProperty}
          >
            {SAVE_BUTTON_LABEL}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiButtonEmpty
            data-test-subj="cancelButton"
            color="danger"
            iconType="crossInACircleFilled"
            onClick={doneEditing}
            disabled={isLoading}
          >
            {CANCEL_BUTTON_LABEL}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
      <EuiFlexItem grow={null}>
        <EuiButtonEmpty
          data-test-subj="editButton"
          size="xs"
          onClick={() => editExistingItem(item)}
        >
          {EDIT_BUTTON_LABEL}
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem grow={null}>
        {!canRemoveLastItem && displayedItems.length === 1 ? (
          <EuiToolTip content={lastItemWarning}>
            <EuiButtonEmpty size="xs" disabled>
              {DELETE_BUTTON_LABEL}
            </EuiButtonEmpty>
          </EuiToolTip>
        ) : (
          <EuiButtonEmpty data-test-subj="deleteButton" size="xs" onClick={() => deleteItem(item)}>
            {DELETE_BUTTON_LABEL}
          </EuiButtonEmpty>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
