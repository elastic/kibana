/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'kibana/server';

import {
  Description,
  ExceptionListSchema,
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
  tags: Tags;
}

export const createExceptionList = async ({
  _tags,
  listId,
  savedObjectsClient,
  namespaceType,
  name,
  description,
  meta,
  tags,
}: CreateExceptionListOptions): Promise<ExceptionListSchema> => {
  const savedObjectType = getSavedObjectType({ namespaceType });
  // TODO: Change this over to saved object type from schema
  // TODO: Add helper methods for creating internal tags maybe?
  const savedObject = await savedObjectsClient.create<ExceptionListSchema>(savedObjectType, {
    _tags,
    description,
    list_id: listId,
    meta,
    name,
    tags,
  });
  return transformSavedObjetToExceptionList({ savedObject });
};
