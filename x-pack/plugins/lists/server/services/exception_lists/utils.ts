/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObject, SavedObjectsFindResponse, SavedObjectsUpdateResponse } from 'kibana/server';

import { NamespaceTypeArray } from '../../../common/schemas/types/default_namespace_array';
import { ErrorWithStatusCode } from '../../error_with_status_code';
import {
  Comments,
  CommentsArray,
  CommentsArrayOrUndefined,
  CreateComments,
  CreateCommentsArrayOrUndefined,
  ExceptionListItemSchema,
  ExceptionListSchema,
  ExceptionListSoSchema,
  FoundExceptionListItemSchema,
  FoundExceptionListSchema,
  NamespaceType,
  UpdateCommentsArrayOrUndefined,
  comments as commentsSchema,
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
    namespace_type: getExceptionListType({ savedObjectType: savedObject.type }),
    tags,
    tie_breaker_id,
    type: exceptionListType.is(type) ? type : 'detection',
    updated_at: updatedAt ?? dateNow,
    updated_by,
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
    namespace_type: getExceptionListType({ savedObjectType: savedObject.type }),
    tags: tags ?? exceptionList.tags,
    tie_breaker_id: exceptionList.tie_breaker_id,
    type: exceptionListType.is(type) ? type : exceptionList.type,
    updated_at: updatedAt ?? dateNow,
    updated_by: updatedBy ?? exceptionList.updated_by,
  };
};

export const transformSavedObjectToExceptionListItem = ({
  savedObject,
}: {
  savedObject: SavedObject<ExceptionListSoSchema>;
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

/*
 * Determines whether two comments are equal, this is a very
 * naive implementation, not meant to be used for deep equality of complex objects
 */
export const isCommentEqual = (commentA: Comments, commentB: Comments): boolean => {
  const a = Object.values(commentA).sort().join();
  const b = Object.values(commentB).sort().join();

  return a === b;
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
  const newComments = comments ?? [];

  if (newComments.length < existingComments.length) {
    throw new ErrorWithStatusCode(
      'Comments cannot be deleted, only new comments may be added',
      403
    );
  } else {
    return newComments.flatMap((c, index) => {
      const existingComment = existingComments[index];

      if (commentsSchema.is(existingComment) && !commentsSchema.is(c)) {
        throw new ErrorWithStatusCode(
          'When trying to update a comment, "created_at" and "created_by" must be present',
          403
        );
      } else if (existingComment == null && commentsSchema.is(c)) {
        throw new ErrorWithStatusCode('Only new comments may be added', 403);
      } else if (
        commentsSchema.is(c) &&
        existingComment != null &&
        isCommentEqual(c, existingComment)
      ) {
        return existingComment;
      } else if (commentsSchema.is(c) && existingComment != null) {
        return transformUpdateComments({ comment: c, existingComment, user });
      } else {
        return transformCreateCommentsToComments({ comments: [c], user }) ?? [];
      }
    });
  }
};

export const transformUpdateComments = ({
  comment,
  existingComment,
  user,
}: {
  comment: Comments;
  existingComment: Comments;
  user: string;
}): Comments => {
  if (comment.created_by !== user) {
    // existing comment is being edited, can only be edited by author
    throw new ErrorWithStatusCode('Not authorized to edit others comments', 401);
  } else if (existingComment.created_at !== comment.created_at) {
    throw new ErrorWithStatusCode('Unable to update comment', 403);
  } else if (comment.comment.trim().length === 0) {
    throw new ErrorWithStatusCode('Empty comments not allowed', 403);
  } else if (comment.comment.trim() !== existingComment.comment) {
    const dateNow = new Date().toISOString();

    return {
      ...existingComment,
      comment: comment.comment,
      updated_at: dateNow,
      updated_by: user,
    };
  } else {
    return existingComment;
  }
};

export const transformCreateCommentsToComments = ({
  comments,
  user,
}: {
  comments: CreateCommentsArrayOrUndefined;
  user: string;
}): CommentsArrayOrUndefined => {
  const dateNow = new Date().toISOString();
  if (comments != null) {
    return comments.map((c: CreateComments) => {
      if (c.comment.trim().length === 0) {
        throw new ErrorWithStatusCode('Empty comments not allowed', 403);
      } else {
        return {
          comment: c.comment,
          created_at: dateNow,
          created_by: user,
        };
      }
    });
  } else {
    return comments;
  }
};
