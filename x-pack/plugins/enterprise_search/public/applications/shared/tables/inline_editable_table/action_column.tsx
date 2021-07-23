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

import { getInlineEditableTableLogic } from './inline_editable_table_logic';
import { ItemWithAnID } from './types';

interface ActionColumnProps<Item> {
  displayedItems: Item[];
  instanceId: string;
  // TODO maybe this should be  a selector
  isActivelyEditing: (i: Item) => boolean;
  isLoading: boolean;
  item: Item;
  canRemoveLastItem?: boolean;
  lastItemWarning?: string;
  uneditableItems?: Item[];
}

export const ActionColumn = <Item extends ItemWithAnID>({
  displayedItems,
  instanceId,
  isActivelyEditing,
  isLoading,
  item,
  canRemoveLastItem,
  lastItemWarning,
  uneditableItems,
}: ActionColumnProps<Item>) => {
  // TODO There is a kea thing that lets us not have to pass this down all of the time
  const inlineEditableTableLogic = getInlineEditableTableLogic<ItemWithAnID>()({ instanceId });
  const { doesEditingItemValueContainEmptyProperty, formErrors, isEditingUnsavedItem } = useValues(
    inlineEditableTableLogic
  );
  const { editExistingItem, deleteItem, doneEditing, saveExistingItem, saveNewItem } = useActions(
    inlineEditableTableLogic
  );

  // TODO this could be passed in as a boolean prop?
  if (uneditableItems?.includes(item)) {
    return null;
  }

  if (isActivelyEditing(item)) {
    return (
      <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
        <EuiFlexItem>
          <EuiButtonEmpty
            data-test-subj="saveButton"
            color="primary"
            iconType="checkInCircleFilled"
            onClick={isEditingUnsavedItem ? saveNewItem : saveExistingItem}
            disabled={
              isLoading ||
              Object.keys(formErrors).length > 0 ||
              doesEditingItemValueContainEmptyProperty
            }
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
