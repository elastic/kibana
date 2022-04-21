/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { ItemWithAnID } from '../types';

import { FormErrors, InlineEditableTableColumn } from './types';

interface InlineEditableTableActions<Item extends ItemWithAnID> {
  deleteItem(item: Item): { item: Item };
  doneEditing(): void;
  editNewItem(): void;
  editExistingItem(item: Item): { item: Item };
  reorderItems(items: Item[], oldItems: Item[]): { items: Item[]; oldItems: Item[] };
  saveExistingItem(): void;
  saveNewItem(): void;
  setEditingItemValue(newValue: Item): { item: Item };
  setFieldErrors(fieldErrors: FormErrors): { fieldErrors: FormErrors };
  setRowErrors(rowErrors: string[]): { rowErrors: string[] };
}

const generateEmptyItem = <Item extends ItemWithAnID>(
  columns: Array<InlineEditableTableColumn<Item>>
): Item => {
  const emptyItem = columns.reduce((acc, column) => ({ ...acc, [column.field]: '' }), {}) as Item;
  return emptyItem;
};

const getUnsavedItemId = () => null;
const doesIdMatchUnsavedId = (idToCheck: number) => idToCheck === getUnsavedItemId();

interface InlineEditableTableValues<Item extends ItemWithAnID> {
  isEditing: boolean;
  // TODO we should editingItemValue have editingItemValue and editingItemId should be a selector
  editingItemId: Item['id'] | null; // editingItem is null when the user is editing a new but not saved item
  editingItemValue: Item | null;
  fieldErrors: FormErrors;
  rowErrors: string[];
  isEditingUnsavedItem: boolean;
  doesEditingItemValueContainEmptyProperty: boolean;
}

export interface InlineEditableTableProps<Item extends ItemWithAnID> {
  columns: Array<InlineEditableTableColumn<Item>>;
  instanceId: string;
  defaultItem: Item;
  // TODO Because these callbacks are params, they are only set on the logic once (i.e., they are cached)
  // which makes using "useState" to back this really hard.
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
  path: (key: string) => ['enterprise_search', 'inline_editable_table_logic', key],
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
    setFieldErrors: (fieldErrors) => ({ fieldErrors }),
    setRowErrors: (rowErrors) => ({ rowErrors }),
  }),
  reducers: ({ props: { columns, defaultItem } }) => ({
    editingItemValue: [
      null,
      {
        doneEditing: () => null,
        editNewItem: () =>
          defaultItem
            ? { ...generateEmptyItem(columns), ...defaultItem }
            : generateEmptyItem(columns),
        editExistingItem: (_, { item }) => item,
        setEditingItemValue: (_, { item }) => item,
      },
    ],
    fieldErrors: [
      {},
      {
        doneEditing: () => ({}),
        setEditingItemValue: () => ({}),
        setFieldErrors: (_, { fieldErrors }) => fieldErrors,
      },
    ],
    rowErrors: [
      [],
      {
        doneEditing: () => [],
        setEditingItemValue: () => [],
        setRowErrors: (_, { rowErrors }) => rowErrors,
      },
    ],
  }),
  selectors: ({ selectors }) => ({
    editingItemId: [
      () => [selectors.editingItemValue],
      (editingItemValue) => editingItemValue?.id ?? null,
    ],
    isEditing: [() => [selectors.editingItemValue], (editingItemValue) => !!editingItemValue],
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
        actions.setFieldErrors(errors);
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
        actions.setFieldErrors(errors);
      } else {
        onUpdate(itemToSave, actions.doneEditing);
      }
    },
  }),
});
