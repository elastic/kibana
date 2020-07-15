/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'kibana/server';

import {
  DescriptionOrUndefined,
  ExceptionListSchema,
  ExceptionListSoSchema,
  ExceptionListTypeOrUndefined,
  IdOrUndefined,
  ListIdOrUndefined,
  MetaOrUndefined,
  NameOrUndefined,
  NamespaceType,
  TagsOrUndefined,
  _TagsOrUndefined,
} from '../../../common/schemas';

import { getSavedObjectType, transformSavedObjectUpdateToExceptionList } from './utils';
import { getExceptionList } from './get_exception_list';

interface UpdateExceptionListOptions {
  id: IdOrUndefined;
  _tags: _TagsOrUndefined;
  name: NameOrUndefined;
  description: DescriptionOrUndefined;
  savedObjectsClient: SavedObjectsClientContract;
  namespaceType: NamespaceType;
  listId: ListIdOrUndefined;
  meta: MetaOrUndefined;
  user: string;
  tags: TagsOrUndefined;
  tieBreaker?: string;
  type: ExceptionListTypeOrUndefined;
}

export const updateExceptionList = async ({
  _tags,
  id,
  savedObjectsClient,
  namespaceType,
  name,
  description,
  listId,
  meta,
  user,
  tags,
  type,
}: UpdateExceptionListOptions): Promise<ExceptionListSchema | null> => {
  const savedObjectType = getSavedObjectType({ namespaceType });
  const exceptionList = await getExceptionList({ id, listId, namespaceType, savedObjectsClient });
  if (exceptionList == null) {
    return null;
  } else {
    const savedObject = await savedObjectsClient.update<ExceptionListSoSchema>(
      savedObjectType,
      exceptionList.id,
      {
        _tags,
        description,
        meta,
        name,
        tags,
        type,
        updated_by: user,
      }
    );
    return transformSavedObjectUpdateToExceptionList({ exceptionList, savedObject });
  }
};
