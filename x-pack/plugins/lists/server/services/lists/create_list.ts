/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import { ElasticsearchClient } from '@kbn/core/server';
import type {
  Description,
  DeserializerOrUndefined,
  IdOrUndefined,
  Immutable,
  ListSchema,
  MetaOrUndefined,
  Name,
  SerializerOrUndefined,
  Type,
} from '@kbn/securitysolution-io-ts-list-types';
import type { Version } from '@kbn/securitysolution-io-ts-types';
import { encodeHitVersion } from '@kbn/securitysolution-es-utils';

import { IndexEsListSchema } from '../../schemas/elastic_query';

export interface CreateListOptions {
  id: IdOrUndefined;
  deserializer: DeserializerOrUndefined;
  serializer: SerializerOrUndefined;
  type: Type;
  name: Name;
  description: Description;
  esClient: ElasticsearchClient;
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
  esClient,
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
  const response = await esClient.index({
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
