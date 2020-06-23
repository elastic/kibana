/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import { APICaller } from 'kibana/server';

import { transformListItemToElasticQuery } from '../utils';
import {
  CreateEsBulkTypeSchema,
  IndexEsListItemSchema,
  MetaOrUndefined,
  Type,
} from '../../../common/schemas';

export interface CreateListItemsBulkOptions {
  listId: string;
  type: Type;
  value: string[];
  callCluster: APICaller;
  listItemIndex: string;
  user: string;
  meta: MetaOrUndefined;
  dateNow?: string;
  tieBreaker?: string[];
}

export const createListItemsBulk = async ({
  listId,
  type,
  value,
  callCluster,
  listItemIndex,
  user,
  meta,
  dateNow,
  tieBreaker,
}: CreateListItemsBulkOptions): Promise<void> => {
  // It causes errors if you try to add items to bulk that do not exist within ES
  if (!value.length) {
    return;
  }
  const body = value.reduce<Array<IndexEsListItemSchema | CreateEsBulkTypeSchema>>(
    (accum, singleValue, index) => {
      const createdAt = dateNow ?? new Date().toISOString();
      const tieBreakerId =
        tieBreaker != null && tieBreaker[index] != null ? tieBreaker[index] : uuid.v4();
      const elasticBody: IndexEsListItemSchema = {
        created_at: createdAt,
        created_by: user,
        list_id: listId,
        meta,
        tie_breaker_id: tieBreakerId,
        updated_at: createdAt,
        updated_by: user,
        ...transformListItemToElasticQuery({ type, value: singleValue }),
      };
      const createBody: CreateEsBulkTypeSchema = { create: { _index: listItemIndex } };
      return [...accum, createBody, elasticBody];
    },
    []
  );

  await callCluster('bulk', {
    body,
    index: listItemIndex,
  });
};
