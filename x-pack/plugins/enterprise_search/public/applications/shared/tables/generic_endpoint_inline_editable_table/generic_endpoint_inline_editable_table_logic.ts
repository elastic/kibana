/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { toastAPIErrors } from '../../flash_messages';
import { getErrorsFromHttpResponse } from '../../flash_messages/handle_api_errors';

import { HttpLogic } from '../../http';
import {
  InlineEditableTableLogic,
  InlineEditableTableProps as InlineEditableTableLogicProps,
} from '../inline_editable_table/inline_editable_table_logic';

import { ItemWithAnID } from '../types';

import { stripIdAndCreatedAtFromItem } from './utils';

interface GenericEndpointInlineEditableTableValues {
  isLoading: boolean;
}

interface GenericEndpointInlineEditableTableActions<Item extends ItemWithAnID> {
  addItem(item: Item, onSuccess: () => void): { item: Item; onSuccess: () => void };
  setLoading(): void;
  clearLoading(): void;
  deleteItem(item: Item, onSuccess: () => void): { item: Item; onSuccess: () => void };
  reorderItems(
    items: Item[],
    oldItems: Item[],
    onSuccess: () => void
  ): { items: Item[]; oldItems: Item[]; onSuccess: () => void };
  updateItem(item: Item, onSuccess: () => void): { item: Item; onSuccess: () => void };
}

interface GenericEndpointInlineEditableTableProps<Item extends ItemWithAnID> {
  dataProperty: string;
  addRoute: string;
  instanceId: string;
  deleteRoute(item: Item): string;
  updateRoute(item: Item): string;
  onAdd(item: Item, items: Item[]): void;
  onDelete(item: Item, items: Item[]): void;
  onUpdate(item: Item, items: Item[]): void;
  // With reordering
  reorderRoute?: string;
  onReorder?(items: Item[]): void;
}

type GenericEndpointInlineEditableTableLogicType<Item extends ItemWithAnID> = MakeLogicType<
  GenericEndpointInlineEditableTableValues,
  GenericEndpointInlineEditableTableActions<Item>,
  GenericEndpointInlineEditableTableProps<Item>
>;

export const GenericEndpointInlineEditableTableLogic = kea<
  GenericEndpointInlineEditableTableLogicType<ItemWithAnID>
>({
  path: (key: string) => ['enterprise_search', 'generic_endpoint_inline_editable_table_logic', key],
  key: (props) => props.instanceId,
  actions: () => ({
    addItem: (item, onSuccess) => ({ item, onSuccess }),
    setLoading: true,
    clearLoading: true,
    deleteItem: (item, onSuccess) => ({ item, onSuccess }),
    reorderItems: (items, oldItems, onSuccess) => ({ items, oldItems, onSuccess }),
    updateItem: (item, onSuccess) => ({ item, onSuccess }),
  }),
  reducers: () => ({
    isLoading: [
      false,
      {
        addItem: () => true,
        setLoading: () => true,
        clearLoading: () => false,
        deleteItem: () => true,
        updateItem: () => true,
      },
    ],
  }),
  listeners: ({ actions, props }) => ({
    addItem: async ({ item, onSuccess }) => {
      const { http } = HttpLogic.values;
      const { addRoute, onAdd, dataProperty } = props;

      try {
        const response = await http.post<Record<string, ItemWithAnID[]>>(addRoute, {
          body: JSON.stringify(item),
        });
        const itemsFromResponse = response[dataProperty];

        onAdd(item, itemsFromResponse);
        onSuccess();
      } catch (e) {
        const errors = getErrorsFromHttpResponse(e);
        InlineEditableTableLogic({
          instanceId: props.instanceId,
        } as InlineEditableTableLogicProps<ItemWithAnID>).actions.setRowErrors(errors);
      } finally {
        actions.clearLoading();
      }
    },
    deleteItem: async ({ item, onSuccess }) => {
      const { http } = HttpLogic.values;
      const { deleteRoute, onDelete, dataProperty } = props;

      try {
        const response = await http.delete<Record<string, ItemWithAnID[]>>(deleteRoute(item));
        const itemsFromResponse = response[dataProperty];

        onDelete(item, itemsFromResponse);
        onSuccess();
      } catch (e) {
        const errors = getErrorsFromHttpResponse(e);
        InlineEditableTableLogic({
          instanceId: props.instanceId,
        } as InlineEditableTableLogicProps<ItemWithAnID>).actions.setRowErrors(errors);
      } finally {
        actions.clearLoading();
      }
    },
    updateItem: async ({ item, onSuccess }) => {
      const { http } = HttpLogic.values;
      const { updateRoute, onUpdate, dataProperty } = props;

      const dataToSubmit = stripIdAndCreatedAtFromItem(item);
      try {
        const response = await http.put<Record<string, ItemWithAnID[]>>(updateRoute(item), {
          body: JSON.stringify(dataToSubmit),
        });
        const itemsFromResponse = response[dataProperty];

        onUpdate(item, itemsFromResponse);
        onSuccess();
      } catch (e) {
        const errors = getErrorsFromHttpResponse(e);
        InlineEditableTableLogic({
          instanceId: props.instanceId,
        } as InlineEditableTableLogicProps<ItemWithAnID>).actions.setRowErrors(errors);
      } finally {
        actions.clearLoading();
      }
    },
    reorderItems: async ({ items, oldItems, onSuccess }) => {
      const { reorderRoute, onReorder, dataProperty } = props;
      if (!reorderRoute || !onReorder) return;

      const { http } = HttpLogic.values;

      const reorderedItemIds = items.map(({ id }, itemIndex) => ({ id, order: itemIndex }));
      onReorder(items); // We optimistically reorder this so that the client-side UI doesn't snap back while waiting for the http response

      try {
        actions.setLoading();

        const response = await http.put<Record<string, ItemWithAnID[]>>(reorderRoute, {
          body: JSON.stringify({ [dataProperty]: reorderedItemIds }),
        });
        const itemsFromResponse = response[dataProperty];

        onReorder(itemsFromResponse); // Final reorder based on server response
        onSuccess();
      } catch (e) {
        onReorder(oldItems);
        toastAPIErrors(e);
      }

      actions.clearLoading();
    },
  }),
});
