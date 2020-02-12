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
  SavedObjectsFindOptionsType,
  SavedObjectsFindOptionsTypeFormatted,
  UserType,
} from './types';

export const formatNewCase = (
  newCase: NewCaseType,
  { full_name, username }: { full_name?: string; username: string }
): CaseAttributes => ({
  created_at: new Date().valueOf(),
  created_by: { full_name, username },
  updated_at: new Date().valueOf(),
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
  created_at: new Date().valueOf(),
  created_by: { full_name, username },
  updated_at: new Date().valueOf(),
});

export function wrapError(error: any): CustomHttpResponseOptions<ResponseError> {
  const boom = isBoom(error) ? error : boomify(error);
  return {
    body: boom,
    headers: boom.output.headers,
    statusCode: boom.output.statusCode,
  };
}

export const formatSavedOptionsFind = (
  savedObjectsFindOptions: SavedObjectsFindOptionsType
): SavedObjectsFindOptionsTypeFormatted => {
  let options: SavedObjectsFindOptionsTypeFormatted = {
    defaultSearchOperator: savedObjectsFindOptions.defaultSearchOperator,
    filter: savedObjectsFindOptions.filter,
    page: savedObjectsFindOptions.page,
    perPage: savedObjectsFindOptions.perPage,
    search: savedObjectsFindOptions.search,
    sortField: savedObjectsFindOptions.sortField,
    sortOrder: savedObjectsFindOptions.sortOrder,
    searchFields: undefined,
    fields: undefined,
  };
  if (savedObjectsFindOptions.fields && savedObjectsFindOptions.fields.length > 0) {
    options = {
      ...options,
      fields: JSON.parse(savedObjectsFindOptions.fields) as string[],
    };
  }
  if (savedObjectsFindOptions.searchFields && savedObjectsFindOptions.searchFields.length > 0) {
    options = {
      ...options,
      searchFields: JSON.parse(savedObjectsFindOptions.searchFields) as string[],
    };
  }
  return options;
};

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
      return [...acc, flattenCaseSavedObject(savedObject)];
    },
    []
  );

export const flattenCaseSavedObject = (
  savedObject: SavedObject<CaseAttributes>
): FlattenedCaseSavedObject => {
  const flattened = {
    ...savedObject,
    ...savedObject.attributes,
  };
  delete flattened.attributes;
  // typescript STEPH FIX
  return flattened;
};

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
): FlattenedCommentSavedObject => {
  const flattened = {
    ...savedObject,
    ...savedObject.attributes,
  };
  delete flattened.attributes;
  // typescript STEPH FIX
  return flattened;
};
