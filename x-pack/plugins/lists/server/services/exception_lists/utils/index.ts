/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import {
  SavedObject,
  SavedObjectsFindResponse,
  SavedObjectsUpdateResponse,
} from '@kbn/core/server';
import {
  CommentsArray,
  CreateComment,
  CreateCommentsArray,
  CreateExceptionListItemSchema,
  ExceptionListItemSchema,
  ExceptionListSchema,
  FoundExceptionListItemSchema,
  FoundExceptionListSchema,
  UpdateCommentsArrayOrUndefined,
  UpdateExceptionListItemSchema,
  exceptionListItemType,
  exceptionListType,
} from '@kbn/securitysolution-io-ts-list-types';
import { getExceptionListType } from '@kbn/securitysolution-list-utils';

import { ExceptionListSoSchema } from '../../../schemas/saved_objects';
import {
  CreateExceptionListItemOptions,
  UpdateExceptionListItemOptions,
} from '../exception_list_client_types';

export { validateData } from './validate_data';

export const transformSavedObjectToExceptionList = ({
  savedObject,
}: {
  savedObject: SavedObject<ExceptionListSoSchema>;
}): ExceptionListSchema => {
  const dateNow = new Date().toISOString();
  const {
    version: _version,
    attributes: {
      /* eslint-disable @typescript-eslint/naming-convention */
      created_at,
      created_by,
      description,
      immutable,
      list_id,
      meta,
      name,
      os_types,
      tags,
      tie_breaker_id,
      type,
      updated_by,
      version,
      /* eslint-enable @typescript-eslint/naming-convention */
    },
    id,
    updated_at: updatedAt,
  } = savedObject;

  // TODO: Change this to do a decode and throw if the saved object is not as expected.
  // TODO: Do a throw if after the decode this is not the correct "list_type: list"
  return {
    _version,
    created_at,
    created_by,
    description,
    id,
    immutable: immutable ?? false, // This should never be undefined for a list (only a list item)
    list_id,
    meta,
    name,
    namespace_type: getExceptionListType({ savedObjectType: savedObject.type }),
    os_types,
    tags,
    tie_breaker_id,
    type: exceptionListType.is(type) ? type : 'detection',
    updated_at: updatedAt ?? dateNow,
    updated_by,
    version: version ?? 1, // This should never be undefined for a list (only a list item)
  };
};

export const transformSavedObjectUpdateToExceptionList = ({
  exceptionList,
  savedObject,
}: {
  exceptionList: ExceptionListSchema;
  savedObject: SavedObjectsUpdateResponse<ExceptionListSoSchema>;
}): ExceptionListSchema => {
  const dateNow = new Date().toISOString();
  const {
    version: _version,
    attributes: {
      description,
      immutable,
      meta,
      name,
      os_types: osTypes,
      tags,
      type,
      updated_by: updatedBy,
      version,
    },
    id,
    updated_at: updatedAt,
  } = savedObject;

  // TODO: Change this to do a decode and throw if the saved object is not as expected.
  // TODO: Do a throw if after the decode this is not the correct "list_type: list"
  return {
    _version,
    created_at: exceptionList.created_at,
    created_by: exceptionList.created_by,
    description: description ?? exceptionList.description,
    id,
    immutable: immutable ?? exceptionList.immutable,
    list_id: exceptionList.list_id,
    meta: meta ?? exceptionList.meta,
    name: name ?? exceptionList.name,
    namespace_type: getExceptionListType({ savedObjectType: savedObject.type }),
    os_types: osTypes ?? exceptionList.os_types,
    tags: tags ?? exceptionList.tags,
    tie_breaker_id: exceptionList.tie_breaker_id,
    type: exceptionListType.is(type) ? type : exceptionList.type,
    updated_at: updatedAt ?? dateNow,
    updated_by: updatedBy ?? exceptionList.updated_by,
    version: version ?? exceptionList.version,
  };
};

export const transformSavedObjectToExceptionListItem = ({
  savedObject,
}: {
  savedObject: SavedObject<ExceptionListSoSchema>;
}): ExceptionListItemSchema => {
  const dateNow = new Date().toISOString();
  const {
    version: _version,
    attributes: {
      /* eslint-disable @typescript-eslint/naming-convention */
      comments,
      created_at,
      created_by,
      description,
      entries,
      item_id: itemId,
      list_id,
      meta,
      name,
      os_types,
      tags,
      tie_breaker_id,
      type,
      updated_by,
      /* eslint-enable @typescript-eslint/naming-convention */
    },
    id,
    updated_at: updatedAt,
  } = savedObject;
  // TODO: Change this to do a decode and throw if the saved object is not as expected.
  // TODO: Do a throw if after the decode this is not the correct "list_type: item"
  // TODO: Do a throw if item_id or entries is not defined.
  return {
    _version,
    comments: comments ?? [],
    created_at,
    created_by,
    description,
    entries: entries ?? [],
    id,
    item_id: itemId ?? '(unknown)',
    list_id,
    meta,
    name,
    namespace_type: getExceptionListType({ savedObjectType: savedObject.type }),
    os_types,
    tags,
    tie_breaker_id,
    type: exceptionListItemType.is(type) ? type : 'simple',
    updated_at: updatedAt ?? dateNow,
    updated_by,
  };
};

export const transformSavedObjectUpdateToExceptionListItem = ({
  exceptionListItem,
  savedObject,
}: {
  exceptionListItem: ExceptionListItemSchema;
  savedObject: SavedObjectsUpdateResponse<ExceptionListSoSchema>;
}): ExceptionListItemSchema => {
  const dateNow = new Date().toISOString();
  const {
    version: _version,
    attributes: {
      comments,
      description,
      entries,
      meta,
      name,
      os_types: osTypes,
      tags,
      type,
      updated_by: updatedBy,
    },
    id,
    updated_at: updatedAt,
  } = savedObject;

  // TODO: Change this to do a decode and throw if the saved object is not as expected.
  // TODO: Do a throw if after the decode this is not the correct "list_type: list"
  // TODO: Update exception list and item types (perhaps separating out) so as to avoid
  // defaulting
  return {
    _version,
    comments: comments ?? exceptionListItem.comments,
    created_at: exceptionListItem.created_at,
    created_by: exceptionListItem.created_by,
    description: description ?? exceptionListItem.description,
    entries: entries ?? exceptionListItem.entries,
    id,
    item_id: exceptionListItem.item_id,
    list_id: exceptionListItem.list_id,
    meta: meta ?? exceptionListItem.meta,
    name: name ?? exceptionListItem.name,
    namespace_type: getExceptionListType({ savedObjectType: savedObject.type }),
    os_types: osTypes ?? exceptionListItem.os_types,
    tags: tags ?? exceptionListItem.tags,
    tie_breaker_id: exceptionListItem.tie_breaker_id,
    type: exceptionListItemType.is(type) ? type : exceptionListItem.type,
    updated_at: updatedAt ?? dateNow,
    updated_by: updatedBy ?? exceptionListItem.updated_by,
  };
};

export const transformSavedObjectsToFoundExceptionListItem = ({
  savedObjectsFindResponse,
}: {
  savedObjectsFindResponse: SavedObjectsFindResponse<ExceptionListSoSchema>;
}): FoundExceptionListItemSchema => {
  return {
    data: savedObjectsFindResponse.saved_objects.map((savedObject) =>
      transformSavedObjectToExceptionListItem({ savedObject })
    ),
    page: savedObjectsFindResponse.page,
    per_page: savedObjectsFindResponse.per_page,
    pit: savedObjectsFindResponse.pit_id,
    total: savedObjectsFindResponse.total,
  };
};

export const transformSavedObjectsToFoundExceptionList = ({
  savedObjectsFindResponse,
}: {
  savedObjectsFindResponse: SavedObjectsFindResponse<ExceptionListSoSchema>;
}): FoundExceptionListSchema => {
  return {
    data: savedObjectsFindResponse.saved_objects.map((savedObject) =>
      transformSavedObjectToExceptionList({ savedObject })
    ),
    page: savedObjectsFindResponse.page,
    per_page: savedObjectsFindResponse.per_page,
    pit: savedObjectsFindResponse.pit_id,
    total: savedObjectsFindResponse.total,
  };
};

export const transformUpdateCommentsToComments = ({
  comments,
  existingComments,
  user,
}: {
  comments: UpdateCommentsArrayOrUndefined;
  existingComments: CommentsArray;
  user: string;
}): CommentsArray => {
  const incomingComments = comments ?? [];
  const newComments = incomingComments.filter((comment) => comment.id == null);
  const newCommentsFormatted = transformCreateCommentsToComments({
    incomingComments: newComments,
    user,
  });

  return [...existingComments, ...newCommentsFormatted];
};

export const transformCreateCommentsToComments = ({
  incomingComments,
  user,
}: {
  incomingComments: CreateCommentsArray;
  user: string;
}): CommentsArray => {
  const dateNow = new Date().toISOString();
  return incomingComments.map((comment: CreateComment) => ({
    comment: comment.comment,
    created_at: dateNow,
    created_by: user,
    id: uuid.v4(),
  }));
};

export const transformCreateExceptionListItemOptionsToCreateExceptionListItemSchema = ({
  listId,
  itemId,
  namespaceType,
  osTypes,
  ...rest
}: CreateExceptionListItemOptions): CreateExceptionListItemSchema => {
  return {
    ...rest,
    item_id: itemId,
    list_id: listId,
    namespace_type: namespaceType,
    os_types: osTypes,
  };
};

export const transformUpdateExceptionListItemOptionsToUpdateExceptionListItemSchema = ({
  itemId,
  namespaceType,
  osTypes,
  // The `UpdateExceptionListItemOptions` type differs from the schema in that some properties are
  // marked as having `undefined` as a valid value, where the schema, however, requires it.
  // So we assign defaults here
  description = '',
  name = '',
  type = 'simple',
  ...rest
}: UpdateExceptionListItemOptions): UpdateExceptionListItemSchema => {
  return {
    ...rest,
    description,
    item_id: itemId,
    name,
    namespace_type: namespaceType,
    os_types: osTypes,
    type,
  };
};
