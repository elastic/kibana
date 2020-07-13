/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import { CreateDocumentResponse } from 'elasticsearch';
import { LegacyAPICaller } from 'kibana/server';

import {
  DeserializerOrUndefined,
  IdOrUndefined,
  IndexEsListItemSchema,
  ListItemSchema,
  MetaOrUndefined,
  SerializerOrUndefined,
  Type,
} from '../../../common/schemas';
import { transformListItemToElasticQuery } from '../utils';

export interface CreateListItemOptions {
  deserializer: DeserializerOrUndefined;
  id: IdOrUndefined;
  serializer: SerializerOrUndefined;
  listId: string;
  type: Type;
  value: string;
  callCluster: LegacyAPICaller;
  listItemIndex: string;
  user: string;
  meta: MetaOrUndefined;
  dateNow?: string;
  tieBreaker?: string;
}

export const createListItem = async ({
  deserializer,
  id,
  serializer,
  listId,
  type,
  value,
  callCluster,
  listItemIndex,
  user,
  meta,
  dateNow,
  tieBreaker,
}: CreateListItemOptions): Promise<ListItemSchema | null> => {
  const createdAt = dateNow ?? new Date().toISOString();
  const tieBreakerId = tieBreaker ?? uuid.v4();
  const baseBody = {
    created_at: createdAt,
    created_by: user,
    deserializer,
    list_id: listId,
    meta,
    serializer,
    tie_breaker_id: tieBreakerId,
    updated_at: createdAt,
    updated_by: user,
  };
  const elasticQuery = transformListItemToElasticQuery({ serializer, type, value });
  if (elasticQuery != null) {
    const body: IndexEsListItemSchema = {
      ...baseBody,
      ...elasticQuery,
    };
    const response = await callCluster<CreateDocumentResponse>('index', {
      body,
      id,
      index: listItemIndex,
      refresh: 'wait_for',
    });

    return {
      id: response._id,
      type,
      value,
      ...baseBody,
    };
  } else {
    return null;
  }
};
