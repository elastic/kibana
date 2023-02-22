/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core/server';
import type {
  DescriptionOrUndefined,
  EntriesArray,
  ExceptionListItemSchema,
  ExceptionListItemTypeOrUndefined,
  ExpireTimeOrUndefined,
  IdOrUndefined,
  ItemIdOrUndefined,
  MetaOrUndefined,
  NameOrUndefined,
  NamespaceType,
  OsTypeArray,
  TagsOrUndefined,
  UpdateCommentsArrayOrUndefined,
  _VersionOrUndefined,
} from '@kbn/securitysolution-io-ts-list-types';
import { getSavedObjectType } from '@kbn/securitysolution-list-utils';

import { ExceptionListSoSchema } from '../../schemas/saved_objects';

import {
  transformSavedObjectUpdateToExceptionListItem,
  transformUpdateCommentsToComments,
} from './utils';
import { getExceptionListItem } from './get_exception_list_item';

interface UpdateExceptionListItemOptions {
  id: IdOrUndefined;
  comments: UpdateCommentsArrayOrUndefined;
  _version: _VersionOrUndefined;
  name: NameOrUndefined;
  description: DescriptionOrUndefined;
  entries: EntriesArray;
  expireTime: ExpireTimeOrUndefined;
  savedObjectsClient: SavedObjectsClientContract;
  namespaceType: NamespaceType;
  osTypes: OsTypeArray;
  itemId: ItemIdOrUndefined;
  meta: MetaOrUndefined;
  user: string;
  tags: TagsOrUndefined;
  tieBreaker?: string;
  type: ExceptionListItemTypeOrUndefined;
}

export const putUpdateExceptionListItem = async ({
  _version,
  comments,
  entries,
  expireTime,
  id,
  savedObjectsClient,
  namespaceType,
  name,
  osTypes,
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
    const savedObject = await savedObjectsClient.create<ExceptionListSoSchema>(
      savedObjectType,
      {
        comments: transformedComments,
        created_at: exceptionListItem.created_at,
        created_by: exceptionListItem.created_by,
        description: description ?? exceptionListItem.description,
        entries,
        expire_time: expireTime,
        immutable: undefined,
        item_id: itemId,
        list_id: exceptionListItem.list_id,
        list_type: 'item',
        meta,
        name: name ?? exceptionListItem.name,
        os_types: osTypes,
        tags: tags ?? exceptionListItem.tags,
        tie_breaker_id: exceptionListItem.tie_breaker_id,
        type: type ?? exceptionListItem.type,
        updated_by: user,
        version: exceptionListItem._version ? parseInt(exceptionListItem._version, 10) : undefined,
      },
      {
        id,
        overwrite: true,
        version: _version,
      }
    );
    return transformSavedObjectUpdateToExceptionListItem({
      exceptionListItem,
      savedObject,
    });
  }
};
