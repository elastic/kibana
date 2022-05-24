/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import { ElasticsearchClient } from '@kbn/core/server';
import {
  DeserializerOrUndefined,
  IdOrUndefined,
  ListItemSchema,
  MetaOrUndefined,
  SerializerOrUndefined,
  Type,
} from '@kbn/securitysolution-io-ts-list-types';
import { encodeHitVersion } from '@kbn/securitysolution-es-utils';

import { transformListItemToElasticQuery } from '../utils';
import { IndexEsListItemSchema } from '../../schemas/elastic_query';

export interface CreateListItemOptions {
  deserializer: DeserializerOrUndefined;
  id: IdOrUndefined;
  serializer: SerializerOrUndefined;
  listId: string;
  type: Type;
  value: string;
  esClient: ElasticsearchClient;
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
  esClient,
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
    const response = await esClient.index({
      body,
      id,
      index: listItemIndex,
      refresh: 'wait_for',
    });

    return {
      _version: encodeHitVersion(response),
      id: response._id,
      type,
      value,
      ...baseBody,
    };
  } else {
    return null;
  }
};
