/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import { ElasticsearchClient } from '@kbn/core/server';
import type {
  DeserializerOrUndefined,
  MetaOrUndefined,
  SerializerOrUndefined,
  Type,
} from '@kbn/securitysolution-io-ts-list-types';

import { transformListItemToElasticQuery } from '../utils';
import { CreateEsBulkTypeSchema, IndexEsListItemSchema } from '../../schemas/elastic_query';

export interface CreateListItemsBulkOptions {
  deserializer: DeserializerOrUndefined;
  serializer: SerializerOrUndefined;
  listId: string;
  type: Type;
  value: string[];
  esClient: ElasticsearchClient;
  listItemIndex: string;
  user: string;
  meta: MetaOrUndefined;
  dateNow?: string;
  tieBreaker?: string[];
}

export const createListItemsBulk = async ({
  listId,
  type,
  deserializer,
  serializer,
  value,
  esClient,
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
      const elasticQuery = transformListItemToElasticQuery({
        serializer,
        type,
        value: singleValue,
      });
      if (elasticQuery != null) {
        const elasticBody: IndexEsListItemSchema = {
          created_at: createdAt,
          created_by: user,
          deserializer,
          list_id: listId,
          meta,
          serializer,
          tie_breaker_id: tieBreakerId,
          updated_at: createdAt,
          updated_by: user,
          ...elasticQuery,
        };
        const createBody: CreateEsBulkTypeSchema = { create: { _index: listItemIndex } };
        return [...accum, createBody, elasticBody];
      } else {
        // TODO: Report errors with return values from the bulk insert into another index or saved object
        return accum;
      }
    },
    []
  );
  try {
    await esClient.bulk({
      body,
      index: listItemIndex,
      refresh: 'wait_for',
    });
  } catch (error) {
    // TODO: Log out the error with return values from the bulk insert into another index or saved object
  }
};
