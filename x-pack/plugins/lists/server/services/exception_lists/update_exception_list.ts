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
  MetaOrUndefined,
  NameOrUndefined,
  TagsOrUndefined,
  _TagsOrUndefined,
} from '../../../common/schemas';

import { getSavedObjectType, transformSavedObjectUpdateToExceptionList } from './utils';
import { NamespaceType } from './types';
import { getExceptionList } from './get_exception_list';

interface UpdateExceptionListOptions {
  id: IdOrUndefined;
  _tags: _TagsOrUndefined;
  name: NameOrUndefined;
  description: DescriptionOrUndefined;
  savedObjectsClient: SavedObjectsClientContract;
  namespaceType: NamespaceType;
  listId: DescriptionOrUndefined;
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
  const list = await getExceptionList({ id, listId, namespaceType, savedObjectsClient });
  if (list == null) {
    return null;
  } else {
    const savedObject = await savedObjectsClient.update<ExceptionListSoSchema>(
      savedObjectType,
      list.id,
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
    return transformSavedObjectUpdateToExceptionList({ list, savedObject });
  }
};
