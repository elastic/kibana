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
  ListId,
  MetaOrUndefined,
  Name,
  Tags,
  _Tags,
} from '../../../common/schemas';

import { getSavedObjectType, transformSavedObjetToExceptionList } from './utils';
import { NamespaceType } from './types';

interface CreateExceptionListOptions {
  _tags: _Tags;
  listId: ListId;
  savedObjectsClient: SavedObjectsClientContract;
  namespaceType: NamespaceType;
  name: Name;
  description: Description;
  meta: MetaOrUndefined;
  user: string;
  tags: Tags;
  tieBreaker?: string;
  type: ExceptionListType;
}

export const createExceptionList = async ({
  _tags,
  listId,
  savedObjectsClient,
  namespaceType,
  name,
  description,
  meta,
  user,
  tags,
  tieBreaker,
  type,
}: CreateExceptionListOptions): Promise<ExceptionListSchema> => {
  const savedObjectType = getSavedObjectType({ namespaceType });
  const dateNow = new Date().toISOString();
  const savedObject = await savedObjectsClient.create<ExceptionListSoSchema>(savedObjectType, {
    _tags,
    created_at: dateNow,
    created_by: user,
    description,
    list_id: listId,
    meta,
    name,
    tags,
    tie_breaker_id: tieBreaker ?? uuid.v4(),
    type,
    updated_by: dateNow,
  });
  return transformSavedObjetToExceptionList({ savedObject });
};
