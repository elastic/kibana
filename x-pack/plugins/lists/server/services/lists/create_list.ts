/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import { CreateDocumentResponse } from 'elasticsearch';
import { LegacyAPICaller } from 'kibana/server';

import {
  Description,
  DeserializerOrUndefined,
  IdOrUndefined,
  IndexEsListSchema,
  ListSchema,
  MetaOrUndefined,
  Name,
  SerializerOrUndefined,
  Type,
} from '../../../common/schemas';

export interface CreateListOptions {
  id: IdOrUndefined;
  deserializer: DeserializerOrUndefined;
  serializer: SerializerOrUndefined;
  type: Type;
  name: Name;
  description: Description;
  callCluster: LegacyAPICaller;
  listIndex: string;
  user: string;
  meta: MetaOrUndefined;
  dateNow?: string;
  tieBreaker?: string;
}

export const createList = async ({
  id,
  deserializer,
  serializer,
  name,
  type,
  description,
  callCluster,
  listIndex,
  user,
  meta,
  dateNow,
  tieBreaker,
}: CreateListOptions): Promise<ListSchema> => {
  const createdAt = dateNow ?? new Date().toISOString();
  const body: IndexEsListSchema = {
    created_at: createdAt,
    created_by: user,
    description,
    deserializer,
    meta,
    name,
    serializer,
    tie_breaker_id: tieBreaker ?? uuid.v4(),
    type,
    updated_at: createdAt,
    updated_by: user,
  };
  const response = await callCluster<CreateDocumentResponse>('index', {
    body,
    id,
    index: listIndex,
  });
  return {
    id: response._id,
    ...body,
  };
};
