/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import { CreateDocumentResponse } from 'elasticsearch';
import { APICaller } from 'kibana/server';

import {
  IdOrUndefined,
  IndexEsListItemSchema,
  ListItemSchema,
  MetaOrUndefined,
  Type,
} from '../../../common/schemas';
import { transformListItemToElasticQuery } from '../utils';

export interface CreateListItemOptions {
  id: IdOrUndefined;
  listId: string;
  type: Type;
  value: string;
  callCluster: APICaller;
  listItemIndex: string;
  user: string;
  meta: MetaOrUndefined;
  dateNow?: string;
  tieBreaker?: string;
}

export const createListItem = async ({
  id,
  listId,
  type,
  value,
  callCluster,
  listItemIndex,
  user,
  meta,
  dateNow,
  tieBreaker,
}: CreateListItemOptions): Promise<ListItemSchema> => {
  const createdAt = dateNow ?? new Date().toISOString();
  const tieBreakerId = tieBreaker ?? uuid.v4();
  const baseBody = {
    created_at: createdAt,
    created_by: user,
    list_id: listId,
    meta,
    tie_breaker_id: tieBreakerId,
    updated_at: createdAt,
    updated_by: user,
  };
  const body: IndexEsListItemSchema = {
    ...baseBody,
    ...transformListItemToElasticQuery({ type, value }),
  };

  const response: CreateDocumentResponse = await callCluster('index', {
    body,
    id,
    index: listItemIndex,
  });

  return {
    id: response._id,
    type,
    value,
    ...baseBody,
  };
};
