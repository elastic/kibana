/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ListsItemsArraySchema, Type } from '../../../common/schemas';
import { getQueryFilterFromTypeValue } from '../utils';
import { DataClient } from '../../types';

import { getListItemByValues } from './get_list_item_by_values';

interface DeleteListItemByValueOptions {
  listId: string;
  type: Type;
  value: string;
  dataClient: DataClient;
  listItemIndex: string;
}

export const deleteListItemByValue = async ({
  listId,
  value,
  type,
  dataClient,
  listItemIndex,
}: DeleteListItemByValueOptions): Promise<ListsItemsArraySchema> => {
  const listItems = await getListItemByValues({
    dataClient,
    listId,
    listItemIndex,
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
    index: listItemIndex,
  });
  return listItems;
};
