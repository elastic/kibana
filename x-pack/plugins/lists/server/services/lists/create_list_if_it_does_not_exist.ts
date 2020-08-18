/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LegacyAPICaller } from 'kibana/server';

import {
  Description,
  DeserializerOrUndefined,
  Id,
  Immutable,
  ListSchema,
  MetaOrUndefined,
  Name,
  SerializerOrUndefined,
  Type,
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
  callCluster: LegacyAPICaller;
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
  callCluster,
  listIndex,
  user,
  meta,
  serializer,
  dateNow,
  tieBreaker,
  version,
  immutable,
}: CreateListIfItDoesNotExistOptions): Promise<ListSchema> => {
  const list = await getList({ callCluster, id, listIndex });
  if (list == null) {
    return createList({
      callCluster,
      dateNow,
      description,
      deserializer,
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
