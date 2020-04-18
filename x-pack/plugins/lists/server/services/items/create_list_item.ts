/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import { CreateDocumentResponse } from 'elasticsearch';

import { ListsItemsSchema, Type, CreateEsListsItemsSchema } from '../../../common/schemas';
import { DataClient } from '../../types';
import { transformListItemsToElasticQuery } from '../utils';

interface CreateListItemOptions {
  id: string | undefined | null;
  listId: string;
  type: Type;
  value: string;
  dataClient: DataClient;
  listsItemsIndex: string;
  user: string;
}

export const createListItem = async ({
  id,
  listId,
  type,
  value,
  dataClient,
  listsItemsIndex,
  user,
}: CreateListItemOptions): Promise<ListsItemsSchema> => {
  const createdAt = new Date().toISOString();
  const tieBreakerId = uuid.v4();
  const body: CreateEsListsItemsSchema = {
    list_id: listId,
    created_at: createdAt,
    tie_breaker_id: tieBreakerId,
    updated_at: createdAt,
    updated_by: user,
    created_by: user,
    ...transformListItemsToElasticQuery({ type, value }),
  };

  const response: CreateDocumentResponse = await dataClient.callAsCurrentUser('index', {
    index: listsItemsIndex,
    id,
    body,
  });

  return {
    id: response._id,
    type,
    value,
    ...body,
  };
};
