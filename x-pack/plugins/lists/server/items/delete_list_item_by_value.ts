/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ListsItemsSchema, Type } from '../../common/schemas';
import { getQueryFilterFromTypeValue } from '../utils';
import { DataClient } from '../types';

import { getListItemsByValues } from './get_list_items_by_values';

interface DeleteListItemByValueOptions {
  listId: string;
  type: Type;
  value: string;
  clusterClient: DataClient;
  listsItemsIndex: string;
}

export const deleteListItemByValue = async ({
  listId,
  value,
  type,
  clusterClient,
  listsItemsIndex,
}: DeleteListItemByValueOptions): Promise<ListsItemsSchema[]> => {
  // TODO: Check before we call into these functions at the validation level that the string is not empty?
  const listItems = await getListItemsByValues({
    type,
    value: [value],
    listId,
    clusterClient,
    listsItemsIndex,
  });
  const values = listItems.map(listItem => listItem.value);
  const filter = getQueryFilterFromTypeValue({
    type,
    value: values,
    listId,
  });
  await clusterClient.callAsCurrentUser('deleteByQuery', {
    index: listsItemsIndex,
    body: {
      query: {
        bool: {
          filter,
        },
      },
    },
  });
  return listItems;
};
