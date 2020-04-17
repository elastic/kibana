/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CreateDocumentResponse } from 'elasticsearch';

import { ListsItemsSchema, Type } from '../../common/schemas';
import { transformListItemsToElasticQuery } from '../utils';
import { DataClient, ElasticListItemUpdateInputType } from '../types';

import { getListItemByValue } from '.';

interface UpdateListItemOptions {
  listId: string;
  type: Type;
  value: string;
  dataClient: DataClient;
  listsItemsIndex: string;
  user: string;
}

export const updateListItem = async ({
  listId,
  type,
  value,
  dataClient,
  listsItemsIndex,
  user,
}: UpdateListItemOptions): Promise<ListsItemsSchema | null> => {
  const updatedAt = new Date().toISOString();
  const listItem = await getListItemByValue({
    listId,
    type,
    value,
    listsItemsIndex,
    dataClient,
  });
  if (listItem == null) {
    return null;
  } else {
    const doc: ElasticListItemUpdateInputType = {
      updated_at: updatedAt,
      updated_by: user,
      ...transformListItemsToElasticQuery({ type, value }),
    };

    // There isn't a UpdateDocumentResponse so I'm using CreateDocumentResponse here as a type
    const response: CreateDocumentResponse = await dataClient.callAsCurrentUser('update', {
      index: listsItemsIndex,
      id: listItem.id,
      body: {
        doc,
      },
    });
    return {
      id: response._id,
      list_id: listId,
      type,
      value,
      created_at: listItem.created_at,
      updated_at: updatedAt,
      created_by: listItem.created_by,
      updated_by: listItem.updated_by,
      tie_breaker_id: listItem.tie_breaker_id,
    };
  }
};
