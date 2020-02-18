/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { boomify, isBoom } from 'boom';
import {
  CustomHttpResponseOptions,
  ResponseError,
  SavedObject,
  SavedObjectsFindResponse,
} from 'kibana/server';
import {
  AllComments,
  CaseAttributes,
  CommentAttributes,
  FlattenedCaseSavedObject,
  FlattenedCommentSavedObject,
  AllCases,
  NewCaseType,
  NewCommentType,
  UserType,
} from './types';

export const formatNewCase = (
  newCase: NewCaseType,
  { full_name, username }: { full_name?: string; username: string }
): CaseAttributes => ({
  created_at: new Date().toISOString(),
  created_by: { full_name, username },
  updated_at: new Date().toISOString(),
  ...newCase,
});

interface NewCommentArgs {
  newComment: NewCommentType;
  full_name?: UserType['full_name'];
  username: UserType['username'];
}
export const formatNewComment = ({
  newComment,
  full_name,
  username,
}: NewCommentArgs): CommentAttributes => ({
  ...newComment,
  created_at: new Date().toISOString(),
  created_by: { full_name, username },
  updated_at: new Date().toISOString(),
});

export function wrapError(error: any): CustomHttpResponseOptions<ResponseError> {
  const boom = isBoom(error) ? error : boomify(error);
  return {
    body: boom,
    headers: boom.output.headers,
    statusCode: boom.output.statusCode,
  };
}

export const formatAllCases = (cases: SavedObjectsFindResponse<CaseAttributes>): AllCases => ({
  page: cases.page,
  per_page: cases.per_page,
  total: cases.total,
  cases: flattenCaseSavedObjects(cases.saved_objects),
});

export const flattenCaseSavedObjects = (
  savedObjects: SavedObjectsFindResponse<CaseAttributes>['saved_objects']
): FlattenedCaseSavedObject[] =>
  savedObjects.reduce(
    (acc: FlattenedCaseSavedObject[], savedObject: SavedObject<CaseAttributes>) => {
      return [...acc, flattenCaseSavedObject(savedObject, [])];
    },
    []
  );

export const flattenCaseSavedObject = (
  savedObject: SavedObject<CaseAttributes>,
  comments: Array<SavedObject<CommentAttributes>>
): FlattenedCaseSavedObject => ({
  case_id: savedObject.id,
  comments: flattenCommentSavedObjects(comments),
  ...savedObject.attributes,
});

export const formatAllComments = (
  comments: SavedObjectsFindResponse<CommentAttributes>
): AllComments => ({
  page: comments.page,
  per_page: comments.per_page,
  total: comments.total,
  comments: flattenCommentSavedObjects(comments.saved_objects),
});

export const flattenCommentSavedObjects = (
  savedObjects: SavedObjectsFindResponse<CommentAttributes>['saved_objects']
): FlattenedCommentSavedObject[] =>
  savedObjects.reduce(
    (acc: FlattenedCommentSavedObject[], savedObject: SavedObject<CommentAttributes>) => {
      return [...acc, flattenCommentSavedObject(savedObject)];
    },
    []
  );

export const flattenCommentSavedObject = (
  savedObject: SavedObject<CommentAttributes>
): FlattenedCommentSavedObject => ({
  comment_id: savedObject.id,
  ...savedObject.attributes,
});
