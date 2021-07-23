/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { ItemWithAnID } from './types';

interface FormErrors {
  [key: string]: string | undefined;
}

interface InlineEditableTableActions<Item extends ItemWithAnID> {
  deleteItem(item: Item): { item: Item };
  doneEditing(): void;
  editNewItem(): void;
  // TODO return object instead
  editExistingItem(item: Item): Item;
  reorderItems(items: Item[], oldItems: Item[]): { items: Item[]; oldItems: Item[] };
  saveExistingItem(): void;
  saveNewItem(): void;
  // TODO return object instead
  setEditingItemValue(newValue: Item): Item;
  // TODO return object instead
  setFormErrors(formErrors: FormErrors): FormErrors;
}

interface InlineEditableTableValues<Item extends ItemWithAnID> {
  isEditing: boolean;
  editingItemId: Item['id'] | null; // editingItem is null when the user is editing a new but not saved item
  editingItemValue: Item | null;
  formErrors: FormErrors;
  isEditingUnsavedItem: boolean;
  doesEditingItemValueContainEmptyProperty: boolean;
}

type InlineEditableTableLogicType<Item extends ItemWithAnID> = MakeLogicType<
  InlineEditableTableValues<Item>,
  InlineEditableTableActions<Item>
>;

export const getInlineEditableTableLogic = <T extends ItemWithAnID>() => {
  return kea<InlineEditableTableLogicType<T>>({
    path: (key: string) => ['enterprise_search', 'app_search', 'inline_editable_table_logic', key],
    key: (props) => props.instanceId,
    actions: () => ({
      deleteItem: (item) => ({ item }),
      doneEditing: true,
      editNewItem: true,
      editExistingItem: (item) => item,
      reorderItems: (items, oldItems) => ({ items, oldItems }),
      saveExistingItem: true,
      saveNewItem: true,
      setEditingItemValue: (newValue) => newValue,
      setFormErrors: (formErrors) => formErrors,
    }),
    reducers: ({ props: { columns, itemId } }) => ({
      isEditing: [false],
      editingItemId: [null],
      // TODO, empty item value default
      editingItemValue: [null], // TODO I changed this to null because empty objects don't have an id
      formErrors: [{}],
      isEditingUnsavedItem: [false],
      doesEditingItemValueContainEmptyProperty: [false],
    }),
  });
};
