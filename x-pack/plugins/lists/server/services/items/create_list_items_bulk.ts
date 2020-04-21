/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';

import { transformListItemsToElasticQuery } from '../utils';
import { DataClient } from '../../types';
import {
  CreateEsBulkTypeSchema,
  IndexEsListsItemsSchema,
  MetaOrUndefined,
  Type,
} from '../../../common/schemas';

interface CreateListItemsBulkOptions {
  listId: string;
  type: Type;
  value: string[];
  dataClient: DataClient;
  listsItemsIndex: string;
  user: string;
  meta: MetaOrUndefined;
}

export const createListItemsBulk = async ({
  listId,
  type,
  value,
  dataClient,
  listsItemsIndex,
  user,
  meta,
}: CreateListItemsBulkOptions): Promise<void> => {
  // It causes errors if you try to add items to bulk that do not exist within ES
  if (!value.length) {
    return;
  }
  const body = value.reduce<Array<IndexEsListsItemsSchema | CreateEsBulkTypeSchema>>(
    (accum, singleValue) => {
      const createdAt = new Date().toISOString();
      const tieBreakerId = uuid.v4();
      const elasticBody: IndexEsListsItemsSchema = {
        created_at: createdAt,
        created_by: user,
        list_id: listId,
        meta,
        tie_breaker_id: tieBreakerId,
        updated_at: createdAt,
        updated_by: user,
        ...transformListItemsToElasticQuery({ type, value: singleValue }),
      };
      const createBody: CreateEsBulkTypeSchema = { create: { _index: listsItemsIndex } };
      return [...accum, createBody, elasticBody];
    },
    []
  );

  await dataClient.callAsCurrentUser('bulk', {
    body,
    index: listsItemsIndex,
  });
};
