/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'kibana/server';

import { ExceptionListSchema, IdOrUndefined, ListIdOrUndefined } from '../../../common/schemas';

import { getSavedObjectType, transformSavedObjetToExceptionList } from './utils';
import { NamespaceType } from './types';

interface GetExceptionListOptions {
  id: IdOrUndefined;
  listId: ListIdOrUndefined;
  savedObjectsClient: SavedObjectsClientContract;
  namespaceType: NamespaceType;
}

export const getExceptionList = async ({
  id,
  savedObjectsClient,
  namespaceType,
}: GetExceptionListOptions): Promise<ExceptionListSchema | null> => {
  const savedObjectType = getSavedObjectType({ namespaceType });
  if (id != null) {
    // TODO: Wrap this in a try/catch block and use the special stuff from saved objects to return null
    // TODO: Change <ExceptionListSchema> to be a saved object type
    const savedObject = await savedObjectsClient.get<ExceptionListSchema>(savedObjectType, id);
    return transformSavedObjetToExceptionList({ savedObject });
  } else {
    return null;
  }
};
