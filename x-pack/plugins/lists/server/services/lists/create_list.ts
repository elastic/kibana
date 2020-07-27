/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import { CreateDocumentResponse } from 'elasticsearch';
import { LegacyAPICaller } from 'kibana/server';

import { encodeHitVersion } from '../utils/encode_hit_version';
import {
  Description,
  DeserializerOrUndefined,
  IdOrUndefined,
  Immutable,
  IndexEsListSchema,
  ListSchema,
  MetaOrUndefined,
  Name,
  SerializerOrUndefined,
  Type,
  Version,
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
  immutable: Immutable;
  version: Version;
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
  immutable,
  version,
}: CreateListOptions): Promise<ListSchema> => {
  const createdAt = dateNow ?? new Date().toISOString();
  const body: IndexEsListSchema = {
    created_at: createdAt,
    created_by: user,
    description,
    deserializer,
    immutable,
    meta,
    name,
    serializer,
    tie_breaker_id: tieBreaker ?? uuid.v4(),
    type,
    updated_at: createdAt,
    updated_by: user,
    version,
  };
  const response = await callCluster<CreateDocumentResponse>('index', {
    body,
    id,
    index: listIndex,
    refresh: 'wait_for',
  });
  return {
    _version: encodeHitVersion(response),
    id: response._id,
    ...body,
  };
};
