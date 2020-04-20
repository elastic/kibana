/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Type, ListsItemsArraySchema } from '../../../common/schemas';
import { getQueryFilterFromTypeValue } from '../utils';
import { DataClient } from '../../types';

import { getListItemsByValues } from './get_list_items_by_values';

interface DeleteListItemByValueOptions {
  listId: string;
  type: Type;
  value: string;
  dataClient: DataClient;
  listsItemsIndex: string;
}

export const deleteListItemByValue = async ({
  listId,
  value,
  type,
  dataClient,
  listsItemsIndex,
}: DeleteListItemByValueOptions): Promise<ListsItemsArraySchema> => {
  const listItems = await getListItemsByValues({
    dataClient,
    listId,
    listsItemsIndex,
    type,
    value: [value],
  });
  const values = listItems.map(listItem => listItem.value);
  const filter = getQueryFilterFromTypeValue({
    listId,
    type,
    value: values,
  });
  await dataClient.callAsCurrentUser('deleteByQuery', {
    body: {
      query: {
        bool: {
          filter,
        },
      },
    },
    index: listsItemsIndex,
  });
  return listItems;
};
