/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CreateDocumentResponse } from 'elasticsearch';

import {
  ListsItemsSchema,
  UpdateEsListsItemsSchema,
  Id,
  MetaOrUndefined,
} from '../../../common/schemas';
import { transformListItemsToElasticQuery } from '../utils';
import { DataClient } from '../../types';

import { getListItem } from './get_list_item';

interface UpdateListItemOptions {
  id: Id;
  value: string | null | undefined;
  dataClient: DataClient;
  listsItemsIndex: string;
  user: string;
  meta: MetaOrUndefined;
}

export const updateListItem = async ({
  id,
  value,
  dataClient,
  listsItemsIndex,
  user,
  meta,
}: UpdateListItemOptions): Promise<ListsItemsSchema | null> => {
  const updatedAt = new Date().toISOString();
  const listItem = await getListItem({ dataClient, id, listsItemsIndex });
  if (listItem == null) {
    return null;
  } else {
    const doc: UpdateEsListsItemsSchema = {
      meta,
      updated_at: updatedAt,
      updated_by: user,
      ...transformListItemsToElasticQuery({ type: listItem.type, value: value ?? listItem.value }),
    };

    const response: CreateDocumentResponse = await dataClient.callAsCurrentUser('update', {
      body: {
        doc,
      },
      id: listItem.id,
      index: listsItemsIndex,
    });
    return {
      created_at: listItem.created_at,
      created_by: listItem.created_by,
      id: response._id,
      list_id: listItem.list_id,
      meta: meta ?? listItem.meta,
      tie_breaker_id: listItem.tie_breaker_id,
      type: listItem.type,
      updated_at: updatedAt,
      updated_by: listItem.updated_by,
      value: value ?? listItem.value,
    };
  }
};
