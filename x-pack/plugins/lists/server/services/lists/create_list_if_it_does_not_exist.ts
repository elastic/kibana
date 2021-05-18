/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'kibana/server';
import {
  Description,
  Id,
  MetaOrUndefined,
  Name,
  Type,
} from '@kbn/securitysolution-io-ts-list-types';

import {
  DeserializerOrUndefined,
  Immutable,
  ListSchema,
  SerializerOrUndefined,
  Version,
} from '../../../common/schemas';

import { getList } from './get_list';
import { createList } from './create_list';

export interface CreateListIfItDoesNotExistOptions {
  id: Id;
  type: Type;
  name: Name;
  deserializer: DeserializerOrUndefined;
  serializer: SerializerOrUndefined;
  description: Description;
  immutable: Immutable;
  esClient: ElasticsearchClient;
  listIndex: string;
  user: string;
  meta: MetaOrUndefined;
  dateNow?: string;
  tieBreaker?: string;
  version: Version;
}

export const createListIfItDoesNotExist = async ({
  id,
  name,
  type,
  description,
  deserializer,
  esClient,
  listIndex,
  user,
  meta,
  serializer,
  dateNow,
  tieBreaker,
  version,
  immutable,
}: CreateListIfItDoesNotExistOptions): Promise<ListSchema> => {
  const list = await getList({ esClient, id, listIndex });
  if (list == null) {
    return createList({
      dateNow,
      description,
      deserializer,
      esClient,
      id,
      immutable,
      listIndex,
      meta,
      name,
      serializer,
      tieBreaker,
      type,
      user,
      version,
    });
  } else {
    return list;
  }
};
