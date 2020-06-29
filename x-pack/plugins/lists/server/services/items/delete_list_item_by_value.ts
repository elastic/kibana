/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LegacyAPICaller } from 'kibana/server';

import { ListItemArraySchema, Type } from '../../../common/schemas';
import { getQueryFilterFromTypeValue } from '../utils';

import { getListItemByValues } from './get_list_item_by_values';

export interface DeleteListItemByValueOptions {
  listId: string;
  type: Type;
  value: string;
  callCluster: LegacyAPICaller;
  listItemIndex: string;
}

export const deleteListItemByValue = async ({
  listId,
  value,
  type,
  callCluster,
  listItemIndex,
}: DeleteListItemByValueOptions): Promise<ListItemArraySchema> => {
  const listItems = await getListItemByValues({
    callCluster,
    listId,
    listItemIndex,
    type,
    value: [value],
  });
  const values = listItems.map((listItem) => listItem.value);
  const filter = getQueryFilterFromTypeValue({
    listId,
    type,
    value: values,
  });
  await callCluster('deleteByQuery', {
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
