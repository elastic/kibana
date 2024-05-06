/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import type { ListItemArraySchema, Type } from '@kbn/securitysolution-io-ts-list-types';

import { getQueryFilterFromTypeValue } from '../utils';

import { getListItemByValues } from './get_list_item_by_values';

export interface DeleteListItemByValueOptions {
  listId: string;
  type: Type;
  value: string;
  esClient: ElasticsearchClient;
  listItemIndex: string;
}

export const deleteListItemByValue = async ({
  listId,
  value,
  type,
  esClient,
  listItemIndex,
}: DeleteListItemByValueOptions): Promise<ListItemArraySchema> => {
  const listItems = await getListItemByValues({
    esClient,
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
  await esClient.deleteByQuery({
    body: {
      query: {
        bool: {
          filter,
        },
      },
    },
    index: listItemIndex,
    refresh: false,
  });
  return listItems;
};
