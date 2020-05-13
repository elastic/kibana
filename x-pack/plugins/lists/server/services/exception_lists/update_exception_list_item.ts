/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'kibana/server';

import {
  CommentOrUndefined,
  DescriptionOrUndefined,
  EntriesArrayOrUndefined,
  ExceptionListItemSchema,
  ExceptionListSoSchema,
  ExceptionListTypeOrUndefined,
  IdOrUndefined,
  ItemIdOrUndefined,
  MetaOrUndefined,
  NameOrUndefined,
  TagsOrUndefined,
  _TagsOrUndefined,
} from '../../../common/schemas';

import { getSavedObjectType, transformSavedObjectUpdateToExceptionListItem } from './utils';
import { NamespaceType } from './types';
import { getExceptionListItem } from './get_exception_list_item';

interface UpdateExceptionListItemOptions {
  id: IdOrUndefined;
  comment: CommentOrUndefined;
  _tags: _TagsOrUndefined;
  name: NameOrUndefined;
  description: DescriptionOrUndefined;
  entries: EntriesArrayOrUndefined;
  savedObjectsClient: SavedObjectsClientContract;
  namespaceType: NamespaceType;
  itemId: ItemIdOrUndefined;
  meta: MetaOrUndefined;
  user: string;
  tags: TagsOrUndefined;
  tieBreaker?: string;
  type: ExceptionListTypeOrUndefined;
}

export const updateExceptionListItem = async ({
  _tags,
  comment,
  entries,
  id,
  savedObjectsClient,
  namespaceType,
  name,
  description,
  itemId,
  meta,
  user,
  tags,
  type,
}: UpdateExceptionListItemOptions): Promise<ExceptionListItemSchema | null> => {
  const savedObjectType = getSavedObjectType({ namespaceType });
  const exceptionListItem = await getExceptionListItem({
    id,
    itemId,
    namespaceType,
    savedObjectsClient,
  });
  if (exceptionListItem == null) {
    return null;
  } else {
    const savedObject = await savedObjectsClient.update<ExceptionListSoSchema>(
      savedObjectType,
      exceptionListItem.id,
      {
        _tags,
        comment,
        description,
        entries,
        meta,
        name,
        tags,
        type,
        updated_by: user,
      }
    );
    return transformSavedObjectUpdateToExceptionListItem({ exceptionListItem, savedObject });
  }
};
