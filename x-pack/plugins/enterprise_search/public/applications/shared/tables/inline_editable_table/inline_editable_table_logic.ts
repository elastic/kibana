/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { FormErrors, InlineEditableTableColumn, ItemWithAnID } from './types';

interface InlineEditableTableActions<Item extends ItemWithAnID> {
  deleteItem(item: Item): { item: Item };
  doneEditing(): void;
  editNewItem(): void;
  editExistingItem(item: Item): { item: Item };
  reorderItems(items: Item[], oldItems: Item[]): { items: Item[]; oldItems: Item[] };
  saveExistingItem(): void;
  saveNewItem(): void;
  setEditingItemValue(newValue: Item): { item: Item };
  setFormErrors(formErrors: FormErrors): { formErrors: FormErrors };
}

const generateEmptyItem = <Item extends ItemWithAnID>(
  columns: Array<InlineEditableTableColumn<Item>>
): Item => {
  const emptyItem = columns.reduce((acc, column) => ({ ...acc, [column.field]: '' }), {}) as Item;
  return emptyItem;
};

// TODO ok, we should do this type of EMPTY_ITEM everywhere, including in the component
export const EMPTY_ITEM = { id: null };
// TODO wtf
const getUnsavedItemId = () => null;
// TODO wtf
const doesIdMatchUnsavedId = (idToCheck: number) => idToCheck === getUnsavedItemId();

interface InlineEditableTableValues<Item extends ItemWithAnID> {
  // TODO This could likely be a selector
  isEditing: boolean;
  // TODO id below
  editingItemId: Item['id'] | null; // editingItem is null when the user is editing a new but not saved item
  editingItemValue: Item | null;
  formErrors: FormErrors;
  isEditingUnsavedItem: boolean;
  doesEditingItemValueContainEmptyProperty: boolean;
}

interface InlineEditableTableProps<Item extends ItemWithAnID> {
  columns: Array<InlineEditableTableColumn<Item>>;
  instanceId: string;
  // TODO Because these callbacks are params, they are only set on the logic once, they will
  // not update as they change, which makes using "useState" almost impossible with these.
  onAdd(item: Item, onSuccess: () => void): void;
  onDelete(item: Item, onSuccess: () => void): void;
  onReorder?(items: Item[], oldItems: Item[], onSuccess: () => void): void;
  onUpdate(item: Item, onSuccess: () => void): void;
  transformItem?(item: Item): Item;
  validateItem?(item: Item): FormErrors;
}

type InlineEditableTableLogicType<Item extends ItemWithAnID> = MakeLogicType<
  InlineEditableTableValues<Item>,
  InlineEditableTableActions<Item>,
  InlineEditableTableProps<Item>
>;

export const InlineEditableTableLogic = kea<InlineEditableTableLogicType<ItemWithAnID>>({
  path: (key: string) => ['enterprise_search', 'app_search', 'inline_editable_table_logic', key],
  key: (props) => props.instanceId,
  actions: () => ({
    deleteItem: (item) => ({ item }),
    doneEditing: true,
    editNewItem: true,
    editExistingItem: (item) => ({ item }),
    reorderItems: (items, oldItems) => ({ items, oldItems }),
    saveExistingItem: true,
    saveNewItem: true,
    setEditingItemValue: (newValue) => ({ item: newValue }),
    setFormErrors: (formErrors) => ({ formErrors }),
  }),
  reducers: ({ props: { columns } }) => ({
    isEditing: [
      false,
      {
        doneEditing: () => false,
        editNewItem: () => true,
        editExistingItem: () => true,
      },
    ],
    // TODO I feel like this could be a seletor...
    editingItemId: [
      null,
      {
        doneEditing: () => null,
        editNewItem: () => getUnsavedItemId(), // TODO This was something weird prior
        editExistingItem: (_, { item }) => item.id,
      },
    ],
    // TODO, empty item value default
    editingItemValue: [
      null,
      {
        doneEditing: () => null,
        editNewItem: () => generateEmptyItem(columns),
        editExistingItem: (_, { item }) => item,
        setEditingItemValue: (_, { item }) => item,
      },
    ], // TODO I changed this to null because empty objects don't have an id
    formErrors: [
      {},
      {
        doneEditing: () => ({}),
        setEditingItemValue: () => ({}),
        setFormErrors: (_, { formErrors }) => formErrors,
      },
    ],
  }),
  selectors: ({ selectors }) => ({
    isEditingUnsavedItem: [
      () => [selectors.isEditing, selectors.editingItemId],
      (isEditing, editingItemId) => {
        return isEditing && doesIdMatchUnsavedId(editingItemId);
      },
    ],
    doesEditingItemValueContainEmptyProperty: [
      () => [selectors.editingItemValue],
      (editingItemValue: object) => {
        return (
          Object.values(editingItemValue || {}).findIndex(
            (value) => typeof value === 'string' && value.length === 0
          ) > -1
        );
      },
    ],
  }),
  listeners: ({
    values,
    actions,
    props: { onAdd, onDelete, onReorder, onUpdate, transformItem, validateItem },
  }) => ({
    saveNewItem: () => {
      if (!values.editingItemValue) return;

      const itemToSave = transformItem
        ? transformItem(values.editingItemValue)
        : values.editingItemValue;
      const errors: FormErrors =
        typeof validateItem === 'undefined' ? {} : validateItem(itemToSave);
      if (Object.keys(errors).length) {
        actions.setFormErrors(errors);
      } else {
        onAdd(itemToSave, actions.doneEditing);
      }
    },
    deleteItem: ({ item: itemToDelete }) => {
      onDelete(itemToDelete, actions.doneEditing);
    },
    reorderItems: ({ items, oldItems }) => {
      if (onReorder) onReorder(items, oldItems, actions.doneEditing);
    },
    saveExistingItem: () => {
      if (!values.editingItemValue) return;
      const itemToSave = values.editingItemValue;
      const errors: FormErrors =
        typeof validateItem === 'undefined' ? {} : validateItem(itemToSave);
      if (Object.keys(errors).length) {
        actions.setFormErrors(errors);
      } else {
        onUpdate(itemToSave, actions.doneEditing);
      }
    },
  }),
});
