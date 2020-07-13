/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'kibana/server';

import {
  DescriptionOrUndefined,
  EntriesArrayOrUndefined,
  ExceptionListItemSchema,
  ExceptionListItemTypeOrUndefined,
  ExceptionListSoSchema,
  IdOrUndefined,
  ItemIdOrUndefined,
  MetaOrUndefined,
  NameOrUndefined,
  NamespaceType,
  TagsOrUndefined,
  UpdateCommentsArrayOrUndefined,
  _TagsOrUndefined,
} from '../../../common/schemas';

import {
  getSavedObjectType,
  transformSavedObjectUpdateToExceptionListItem,
  transformUpdateCommentsToComments,
} from './utils';
import { getExceptionListItem } from './get_exception_list_item';

interface UpdateExceptionListItemOptions {
  id: IdOrUndefined;
  comments: UpdateCommentsArrayOrUndefined;
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
  type: ExceptionListItemTypeOrUndefined;
}

export const updateExceptionListItem = async ({
  _tags,
  comments,
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
    const transformedComments = transformUpdateCommentsToComments({
      comments,
      existingComments: exceptionListItem.comments,
      user,
    });
    const savedObject = await savedObjectsClient.update<ExceptionListSoSchema>(
      savedObjectType,
      exceptionListItem.id,
      {
        _tags,
        comments: transformedComments,
        description,
        entries,
        meta,
        name,
        tags,
        type,
        updated_by: user,
      }
    );
    return transformSavedObjectUpdateToExceptionListItem({
      exceptionListItem,
      namespaceType,
      savedObject,
    });
  }
};
