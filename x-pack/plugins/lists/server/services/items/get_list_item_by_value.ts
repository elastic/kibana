/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Type, ListsItemsArraySchema } from '../../../common/schemas';
import { DataClient } from '../../types';

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
}: GetListItemByValueOptions): Promise<ListsItemsArraySchema> => {
  return getListItemsByValues({
    dataClient,
    listId,
    listsItemsIndex,
    type,
    value: [value],
  });
};
