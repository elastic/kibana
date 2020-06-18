/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObject, SavedObjectsFindResponse, SavedObjectsUpdateResponse } from 'kibana/server';

import { ErrorWithStatusCode } from '../../error_with_status_code';
import {
  Comments,
  CommentsArrayOrUndefined,
  CommentsNew,
  CommentsNewArrayOrUndefined,
  CommentsUpdateArrayOrUndefined,
  ExceptionListItemSchema,
  ExceptionListSchema,
  ExceptionListSoSchema,
  FoundExceptionListItemSchema,
  FoundExceptionListSchema,
  NamespaceType,
  commentsNew,
  comments as commentsSchema,
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

export const transformSavedObjectToExceptionList = ({
  savedObject,
  namespaceType,
}: {
  savedObject: SavedObject<ExceptionListSoSchema>;
  namespaceType: NamespaceType;
}): ExceptionListSchema => {
  const dateNow = new Date().toISOString();
  const {
    attributes: {
      _tags,
      created_at,
      created_by,
      description,
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
  // TODO: Do a throw if after the decode this is not the correct "list_type: list"
  return {
    _tags,
    created_at,
    created_by,
    description,
    id,
    list_id,
    meta,
    name,
    namespace_type: namespaceType,
    tags,
    tie_breaker_id,
    type,
    updated_at: updatedAt ?? dateNow,
    updated_by,
  };
};

export const transformSavedObjectUpdateToExceptionList = ({
  exceptionList,
  savedObject,
  namespaceType,
}: {
  exceptionList: ExceptionListSchema;
  savedObject: SavedObjectsUpdateResponse<ExceptionListSoSchema>;
  namespaceType: NamespaceType;
}): ExceptionListSchema => {
  const dateNow = new Date().toISOString();
  const {
    attributes: { _tags, description, meta, name, tags, type, updated_by: updatedBy },
    id,
    updated_at: updatedAt,
  } = savedObject;

  // TODO: Change this to do a decode and throw if the saved object is not as expected.
  // TODO: Do a throw if after the decode this is not the correct "list_type: list"
  return {
    _tags: _tags ?? exceptionList._tags,
    created_at: exceptionList.created_at,
    created_by: exceptionList.created_by,
    description: description ?? exceptionList.description,
    id,
    list_id: exceptionList.list_id,
    meta: meta ?? exceptionList.meta,
    name: name ?? exceptionList.name,
    namespace_type: namespaceType,
    tags: tags ?? exceptionList.tags,
    tie_breaker_id: exceptionList.tie_breaker_id,
    type: type ?? exceptionList.type,
    updated_at: updatedAt ?? dateNow,
    updated_by: updatedBy ?? exceptionList.updated_by,
  };
};

export const transformSavedObjectToExceptionListItem = ({
  savedObject,
  namespaceType,
}: {
  savedObject: SavedObject<ExceptionListSoSchema>;
  namespaceType: NamespaceType;
}): ExceptionListItemSchema => {
  const dateNow = new Date().toISOString();
  const {
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
    namespace_type: namespaceType,
    tags,
    tie_breaker_id,
    type,
    updated_at: updatedAt ?? dateNow,
    updated_by,
  };
};

export const transformSavedObjectUpdateToExceptionListItem = ({
  exceptionListItem,
  savedObject,
  namespaceType,
}: {
  exceptionListItem: ExceptionListItemSchema;
  savedObject: SavedObjectsUpdateResponse<ExceptionListSoSchema>;
  namespaceType: NamespaceType;
}): ExceptionListItemSchema => {
  const dateNow = new Date().toISOString();
  const {
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
  return {
    _tags: _tags ?? exceptionListItem._tags,
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
    namespace_type: namespaceType,
    tags: tags ?? exceptionListItem.tags,
    tie_breaker_id: exceptionListItem.tie_breaker_id,
    type: type ?? exceptionListItem.type,
    updated_at: updatedAt ?? dateNow,
    updated_by: updatedBy ?? exceptionListItem.updated_by,
  };
};

export const transformSavedObjectsToFoundExceptionListItem = ({
  savedObjectsFindResponse,
  namespaceType,
}: {
  savedObjectsFindResponse: SavedObjectsFindResponse<ExceptionListSoSchema>;
  namespaceType: NamespaceType;
}): FoundExceptionListItemSchema => {
  return {
    data: savedObjectsFindResponse.saved_objects.map((savedObject) =>
      transformSavedObjectToExceptionListItem({ namespaceType, savedObject })
    ),
    page: savedObjectsFindResponse.page,
    per_page: savedObjectsFindResponse.per_page,
    total: savedObjectsFindResponse.total,
  };
};

export const transformSavedObjectsToFoundExceptionList = ({
  savedObjectsFindResponse,
  namespaceType,
}: {
  savedObjectsFindResponse: SavedObjectsFindResponse<ExceptionListSoSchema>;
  namespaceType: NamespaceType;
}): FoundExceptionListSchema => {
  return {
    data: savedObjectsFindResponse.saved_objects.map((savedObject) =>
      transformSavedObjectToExceptionList({ namespaceType, savedObject })
    ),
    page: savedObjectsFindResponse.page,
    per_page: savedObjectsFindResponse.per_page,
    total: savedObjectsFindResponse.total,
  };
};

/*
 * Determines whether two comments are equal, this is a very
 * naive implementation, not meant to be used for deep equality of complex objects
 */
export const isCommentEqual = (
  commentA: Comments | CommentsNew,
  commentB: Comments | CommentsNew
): boolean => {
  const a = Object.values(commentA).sort().join();
  const b = Object.values(commentB).sort().join();

  return a === b;
};

export const transformCommentsUpdate = ({
  newComments,
  existingComments,
  user,
}: {
  newComments: CommentsUpdateArrayOrUndefined;
  existingComments: CommentsArrayOrUndefined;
  user: string;
}): CommentsArrayOrUndefined => {
  if (
    newComments != null &&
    newComments.length === 0 &&
    existingComments != null &&
    existingComments.length > 0
  ) {
    throw new ErrorWithStatusCode(
      'Comments cannot be deleted, only new comments may be appended',
      403
    );
  } else if (newComments != null) {
    const existing = existingComments ?? [];
    return newComments.flatMap((c, index) => {
      const existingComment = existing[index];

      // no comments exist, and user tries to add comment of type `comment`
      if (commentsSchema.is(c) && existing.length === 0) {
        throw new ErrorWithStatusCode('Only new comments may be appended', 403);
      } else if (index <= existing.length - 1 && !isCommentEqual(c, existingComment)) {
        throw new ErrorWithStatusCode(
          'Existing comments cannot be edited, only new comments may be appended',
          403
        );
      } else if (index > existing.length - 1 && commentsNew.is(c)) {
        const newComment = transformNewComments({ newComments: [c], user });
        return newComment ?? [];
      } else {
        return commentsSchema.is(c) ? c : [];
      }
    });
  } else {
    return existingComments;
  }
};

export const transformNewComments = ({
  newComments,
  user,
}: {
  newComments: CommentsNewArrayOrUndefined;
  user: string;
}): CommentsArrayOrUndefined => {
  const dateNow = new Date().toISOString();
  if (newComments != null) {
    return newComments.map((c: CommentsNew) => {
      return {
        comment: c.comment,
        created_at: dateNow,
        created_by: user,
      };
    });
  } else {
    return newComments;
  }
};
