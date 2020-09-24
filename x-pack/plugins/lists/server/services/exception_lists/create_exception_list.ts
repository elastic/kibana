/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'kibana/server';
import uuid from 'uuid';

import {
  Description,
  ExceptionListSchema,
  ExceptionListSoSchema,
  ExceptionListType,
  Immutable,
  ListId,
  MetaOrUndefined,
  Name,
  NamespaceType,
  Tags,
  Version,
} from '../../../common/schemas';

import { getSavedObjectType, transformSavedObjectToExceptionList } from './utils';

interface CreateExceptionListOptions {
  listId: ListId;
  savedObjectsClient: SavedObjectsClientContract;
  namespaceType: NamespaceType;
  name: Name;
  description: Description;
  immutable: Immutable;
  meta: MetaOrUndefined;
  user: string;
  tags: Tags;
  tieBreaker?: string;
  type: ExceptionListType;
  version: Version;
}

export const createExceptionList = async ({
  listId,
  immutable,
  savedObjectsClient,
  namespaceType,
  name,
  description,
  meta,
  user,
  tags,
  tieBreaker,
  type,
  version,
}: CreateExceptionListOptions): Promise<ExceptionListSchema> => {
  const savedObjectType = getSavedObjectType({ namespaceType });
  const dateNow = new Date().toISOString();
  const savedObject = await savedObjectsClient.create<ExceptionListSoSchema>(savedObjectType, {
    comments: undefined,
    created_at: dateNow,
    created_by: user,
    description,
    entries: undefined,
    immutable,
    item_id: undefined,
    list_id: listId,
    list_type: 'list',
    meta,
    name,
    os_types: [],
    tags,
    tie_breaker_id: tieBreaker ?? uuid.v4(),
    type,
    updated_by: user,
    version,
  });
  return transformSavedObjectToExceptionList({ savedObject });
};
