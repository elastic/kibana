/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiFormRow, EuiText } from '@elastic/eui';

import { InlineEditableTableLogic } from './inline_editable_table_logic';
import { InlineEditableTableColumn, ItemWithAnID } from './types';

interface EditingColumnProps<Item extends ItemWithAnID> {
  column: InlineEditableTableColumn<Item>;
  isLoading?: boolean;
}

export const EditingColumn = <Item extends ItemWithAnID>({
  column,
  isLoading = false,
}: EditingColumnProps<Item>) => {
  const { formErrors, editingItemValue } = useValues(InlineEditableTableLogic);
  const { setEditingItemValue } = useActions(InlineEditableTableLogic);

  if (!editingItemValue) return null;

  return (
    <EuiFormRow
      fullWidth
      helpText={
        <EuiText color="danger" size="s">
          {formErrors[column.field]}
        </EuiText>
      }
      isInvalid={!!formErrors[column.field]}
    >
      <>
        {column.editingRender(
          editingItemValue as Item, // TODO we shouldn't need to cast this?
          (newValue) => {
            setEditingItemValue({
              ...editingItemValue,
              [column.field]: newValue, // TODO Can newValue ever be something other than a string?
            });
          },
          {
            isInvalid: !!formErrors[column.field],
            isLoading,
          }
        )}
      </>
    </EuiFormRow>
  );
};
