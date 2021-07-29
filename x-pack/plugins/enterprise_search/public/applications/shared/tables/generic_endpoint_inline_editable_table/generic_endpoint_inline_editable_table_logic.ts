/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { flashAPIErrors } from '../../flash_messages';

import { HttpLogic } from '../../http';

import { ItemWithAnID } from '../types';

import { EndpointRoute } from './types';

interface GenericEndpointInlineEditableTableValues {
  isLoading: boolean;
}

interface GenericEndpointInlineEditableTableActions<Item extends ItemWithAnID> {
  addItem(item: Item, onSuccess: () => void): { item: Item; onSuccess: () => void };
  clearLoading(): void;
  deleteItem(item: Item, onSuccess: () => void): { item: Item; onSuccess: () => void };
  reorderItems(
    items: Item[],
    oldItems: Item[],
    onSuccess: () => void
  ): { items: Item[]; oldItems: Item[]; onSuccess: () => void };
  updateItem(item: Item, onSuccess: () => void): { item: Item; onSuccess: () => void };
}

interface GenericEndpointInlineEditableTablePropsWithoutReordering<Item extends ItemWithAnID> {
  dataProperty: string;
  addRoute: string;
  instanceId: string;
  deleteRoute: EndpointRoute<Item>;
  updateRoute: EndpointRoute<Item>;
  onAdd(item: Item, items: Item[]): void;
  onDelete(item: Item, items: Item[]): void;
  onUpdate(item: Item, items: Item[]): void;
}

type GenericEndpointInlineEditableTablePropsWithReordering<
  Item extends ItemWithAnID
> = GenericEndpointInlineEditableTablePropsWithoutReordering<Item> & {
  reorderRoute?: string;
  onReorder?(items: Item[]): void;
};

type GenericEndpointInlineEditableTableProps<Item extends ItemWithAnID> =
  | GenericEndpointInlineEditableTablePropsWithReordering<Item>
  | GenericEndpointInlineEditableTablePropsWithReordering<Item>;

type GenericEndpointInlineEditableTableLogicType<Item extends ItemWithAnID> = MakeLogicType<
  GenericEndpointInlineEditableTableValues,
  GenericEndpointInlineEditableTableActions<Item>,
  GenericEndpointInlineEditableTableProps<Item>
>;

const stripIdAndCreatedAtFromItem = (item: object) => {
  // TODO we should really enforce this type elsewhere
  const itemToClean = { ...item } as { id?: string; created_at?: string };
  delete itemToClean.id;
  delete itemToClean.created_at;
  return itemToClean;
};

function hasReorderProps<Item extends ItemWithAnID>(
  props: GenericEndpointInlineEditableTableProps<Item>
): props is GenericEndpointInlineEditableTablePropsWithReordering<Item> {
  const castedProps = props as GenericEndpointInlineEditableTablePropsWithReordering<Item>;
  return castedProps.reorderRoute !== undefined && castedProps.onReorder !== undefined;
}

const saveAndCallback = async <Item extends ItemWithAnID>(
  httpCall: (path: string, data: object) => Promise<object>,
  route: string,
  item: Item,
  requestData: object,
  responseDataProperty: string,
  callback: (item: Item, items: Item[]) => void,
  onSuccess: () => void,
  onFinally: () => void
) => {
  try {
    // @ts-ignore The response should have responseDataProperty
    const { [responseDataProperty]: itemsFromResponse } = await httpCall(route, requestData);
    callback(item, itemsFromResponse);
    onSuccess();
  } catch (e) {
    flashAPIErrors(e);
  }

  onFinally();
};

export const GenericEndpointInlineEditableTableLogic = kea<
  GenericEndpointInlineEditableTableLogicType<ItemWithAnID>
>({
  path: (key: string) => ['enterprise_search', 'generic_endpoint_inline_editable_table_logic', key],
  key: (props) => props.instanceId,
  actions: () => ({
    addItem: (item, onSuccess) => ({ item, onSuccess }),
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
        clearLoading: () => false,
        deleteItem: () => true,
        updateItem: () => true,
      },
    ],
  }),
  listeners: ({ actions, props }) => ({
    addItem: ({ item, onSuccess }) => {
      const { http } = HttpLogic.values;

      saveAndCallback(
        http.post,
        props.addRoute,
        item,
        {
          body: JSON.stringify(item),
        },
        props.dataProperty,
        props.onAdd,
        onSuccess,
        actions.clearLoading
      );
    },
    deleteItem: ({ item, onSuccess }) => {
      const { http } = HttpLogic.values;

      saveAndCallback(
        http.delete,
        props.deleteRoute(item),
        item,
        {}, // We don't need to submit any data for the delete request
        props.dataProperty,
        props.onDelete,
        onSuccess,
        actions.clearLoading
      );
    },
    updateItem: ({ item, onSuccess }) => {
      const { http } = HttpLogic.values;

      const dataToSubmit = stripIdAndCreatedAtFromItem(item);
      saveAndCallback(
        http.put,
        props.updateRoute(item),
        item,
        { body: JSON.stringify(dataToSubmit) },
        props.dataProperty,
        props.onUpdate,
        onSuccess,
        actions.clearLoading
      );
    },
    reorderItems: async ({ items, oldItems, onSuccess }) => {
      const { http } = HttpLogic.values;

      if (hasReorderProps(props)) {
        const reorderedItemIds = items.map(({ id }, itemIndex) => ({ id, order: itemIndex }));
        // @ts-ignore We know reorderRoute exists because we checked for it
        props.onReorder(items);

        try {
          // TODO it clears loading later but it never sets the loading state to true

          // @ts-ignore We know reorderRoute exists because we checked for it
          const { [props.dataProperty]: itemsFromResponse } = await http.put(props.reorderRoute, {
            body: JSON.stringify({ [props.dataProperty]: reorderedItemIds }),
          });

          // @ts-ignore We know reorderRoute exists because we checked for it
          props.onReorder(itemsFromResponse);
          onSuccess();
        } catch (e) {
          // @ts-ignore We know reorderRoute exists because we checked for it
          props.onReorder(oldItems);
          flashAPIErrors(e);
        }

        actions.clearLoading();
      }
    },
  }),
});
