/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CreateDocumentResponse } from 'elasticsearch';

import { ListsItemsSchema, UpdateEsListsItemsSchema } from '../../../common/schemas';
import { transformListItemsToElasticQuery } from '../utils';
import { DataClient } from '../../types';

import { getListItem } from './get_list_item';

interface UpdateListItemOptions {
  id: string;
  value: string | null | undefined;
  dataClient: DataClient;
  listsItemsIndex: string;
  user: string;
}

export const updateListItem = async ({
  id,
  value,
  dataClient,
  listsItemsIndex,
  user,
}: UpdateListItemOptions): Promise<ListsItemsSchema | null> => {
  const updatedAt = new Date().toISOString();
  const listItem = await getListItem({ id, dataClient, listsItemsIndex });
  if (listItem == null) {
    return null;
  } else {
    const doc: UpdateEsListsItemsSchema = {
      updated_at: updatedAt,
      updated_by: user,
      ...transformListItemsToElasticQuery({ type: listItem.type, value: value ?? listItem.value }),
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
      list_id: listItem.list_id,
      type: listItem.type,
      value: value ?? listItem.value,
      created_at: listItem.created_at,
      updated_at: updatedAt,
      created_by: listItem.created_by,
      updated_by: listItem.updated_by,
      tie_breaker_id: listItem.tie_breaker_id,
    };
  }
};
