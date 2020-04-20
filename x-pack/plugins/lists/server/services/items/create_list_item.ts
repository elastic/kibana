/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import { CreateDocumentResponse } from 'elasticsearch';

import {
  CreateEsListsItemsSchema,
  IdOrUndefined,
  ListsItemsSchema,
  MetaOrUndefined,
  Type,
} from '../../../common/schemas';
import { DataClient } from '../../types';
import { transformListItemsToElasticQuery } from '../utils';

interface CreateListItemOptions {
  id: IdOrUndefined;
  listId: string;
  type: Type;
  value: string;
  dataClient: DataClient;
  listsItemsIndex: string;
  user: string;
  meta: MetaOrUndefined;
}

export const createListItem = async ({
  id,
  listId,
  type,
  value,
  dataClient,
  listsItemsIndex,
  user,
  meta,
}: CreateListItemOptions): Promise<ListsItemsSchema> => {
  const createdAt = new Date().toISOString();
  const tieBreakerId = uuid.v4();
  const baseBody = {
    created_at: createdAt,
    created_by: user,
    list_id: listId,
    meta,
    tie_breaker_id: tieBreakerId,
    updated_at: createdAt,
    updated_by: user,
  };
  const body: CreateEsListsItemsSchema = {
    ...baseBody,
    ...transformListItemsToElasticQuery({ type, value }),
  };

  const response: CreateDocumentResponse = await dataClient.callAsCurrentUser('index', {
    body,
    id,
    index: listsItemsIndex,
  });

  return {
    id: response._id,
    type,
    value,
    ...baseBody,
  };
};
