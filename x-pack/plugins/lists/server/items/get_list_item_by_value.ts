/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ListsItemsSchema, Type } from '../../common/schemas';
import { DataClient } from '../types';

import { getListItemsByValues } from '.';

interface GetListItemByValueOptions {
  listId: string;
  dataClient: DataClient;
  listsItemsIndex: string;
  type: Type;
  value: string;
}

export const getListItemByValue = async ({
  listId,
  dataClient,
  listsItemsIndex,
  type,
  value,
}: GetListItemByValueOptions): Promise<ListsItemsSchema | null> => {
  const listItems = await getListItemsByValues({
    listId,
    dataClient,
    listsItemsIndex,
    type,
    value: [value],
  });
  if (listItems.length) {
    return listItems[0];
  } else {
    return null;
  }
};
