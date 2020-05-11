/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'kibana/server';

import { ExceptionListSchema, ListId } from '../../../common/schemas';

import { getSavedObjectType, transformSavedObjetToExceptionList } from './utils';
import { NamespaceType } from './types';

interface CreateExceptionListOptions {
  listId: ListId;
  savedObjectsClient: SavedObjectsClientContract;
  namespaceType: NamespaceType;
}

export const createExceptionList = async ({
  listId,
  savedObjectsClient,
  namespaceType,
}: CreateExceptionListOptions): Promise<ExceptionListSchema | null> => {
  const savedObjectType = getSavedObjectType({ namespaceType });
  // TODO: Change this over to saved object type from schema
  const savedObject = await savedObjectsClient.create<ExceptionListSchema>(savedObjectType, {
    _tags: [listId],
  });
  return transformSavedObjetToExceptionList({ savedObject });
};
