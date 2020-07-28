/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import uuid from 'uuid';
import { SavedObject, SavedObjectsFindResponse, SavedObjectsUpdateResponse } from 'kibana/server';

import { NamespaceTypeArray } from '../../../common/schemas/types/default_namespace_array';
import {
  CommentsArray,
  CreateComment,
  CreateCommentsArray,
  ExceptionListItemSchema,
  ExceptionListSchema,
  ExceptionListSoSchema,
  FoundExceptionListItemSchema,
  FoundExceptionListSchema,
  NamespaceType,
  UpdateCommentsArrayOrUndefined,
  exceptionListItemType,
  exceptionListType,
} from '../../../common/schemas';
import {
  SavedObjectType,
  exceptionListAgnosticSavedObjectType,
  exceptionListSavedObjectType,
} from '../../saved_objects';

export const getSavedObjectType = ({
  namespaceType,
}: {
  namespaceType: NamespaceType;
}): SavedObjectType => {
  if (namespaceType === 'agnostic') {
    return exceptionListAgnosticSavedObjectType;
  } else {
    return exceptionListSavedObjectType;
  }
};

export const getExceptionListType = ({
  savedObjectType,
}: {
  savedObjectType: string;
}): NamespaceType => {
  if (savedObjectType === exceptionListAgnosticSavedObjectType) {
    return 'agnostic';
  } else {
    return 'single';
  }
};

export const getSavedObjectTypes = ({
  namespaceType,
}: {
  namespaceType: NamespaceTypeArray;
}): SavedObjectType[] => {
  return namespaceType.map((singleNamespaceType) =>
    getSavedObjectType({ namespaceType: singleNamespaceType })
  );
};

export const transformSavedObjectToExceptionList = ({
  savedObject,
}: {
  savedObject: SavedObject<ExceptionListSoSchema>;
}): ExceptionListSchema => {
  const dateNow = new Date().toISOString();
  const {
    version: _version,
    attributes: {
      _tags,
      created_at,
      created_by,
      description,
      immutable,
      list_id,
      meta,
      name,
      tags,
      tie_breaker_id,
      type,
      updated_by,
      version,
    },
    id,
    updated_at: updatedAt,
  } = savedObject;

  // TODO: Change this to do a decode and throw if the saved object is not as expected.
  // TODO: Do a throw if after the decode this is not the correct "list_type: list"
  return {
    _tags,
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
      _tags,
      description,
      immutable,
      meta,
      name,
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
    _tags: _tags ?? exceptionList._tags,
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
      _tags,
      comments,
      created_at,
      created_by,
      description,
      entries,
      item_id: itemId,
      list_id,
      meta,
      name,
      tags,
      tie_breaker_id,
      type,
      updated_by,
    },
    id,
    updated_at: updatedAt,
  } = savedObject;
  // TODO: Change this to do a decode and throw if the saved object is not as expected.
  // TODO: Do a throw if after the decode this is not the correct "list_type: item"
  // TODO: Do a throw if item_id or entries is not defined.
  return {
    _tags,
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
      _tags,
      comments,
      description,
      entries,
      meta,
      name,
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
    _tags: _tags ?? exceptionListItem._tags,
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
