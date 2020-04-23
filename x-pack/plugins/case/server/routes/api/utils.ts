/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { boomify, isBoom } from 'boom';
import {
  CustomHttpResponseOptions,
  ResponseError,
  SavedObject,
  SavedObjectsFindResponse,
} from 'kibana/server';

import {
  CasePostRequest,
  CaseResponse,
  CasesFindResponse,
  CaseAttributes,
  CommentResponse,
  CommentsResponse,
  CommentAttributes,
} from '../../../common/api';

import { SortFieldCase, ExtraCaseData } from './types';

export const transformNewCase = ({
  connectorId,
  createdDate,
  email,
  full_name,
  newCase,
  username,
}: {
  connectorId: string | null;
  createdDate: string;
  email?: string | null;
  full_name?: string | null;
  newCase: CasePostRequest;
  username?: string | null;
}): CaseAttributes => ({
  ...newCase,
  closed_at: null,
  closed_by: null,
  connector_id: connectorId,
  created_at: createdDate,
  created_by: { email, full_name, username },
  external_service: null,
  status: 'open',
  updated_at: null,
  updated_by: null,
});

interface NewCommentArgs {
  comment: string;
  createdDate: string;
  email?: string | null;
  full_name?: string | null;
  username?: string | null;
}
export const transformNewComment = ({
  comment,
  createdDate,
  email,
  full_name,
  username,
}: NewCommentArgs): CommentAttributes => ({
  comment,
  created_at: createdDate,
  created_by: { email, full_name, username },
  pushed_at: null,
  pushed_by: null,
  updated_at: null,
  updated_by: null,
});

export function wrapError(error: any): CustomHttpResponseOptions<ResponseError> {
  const options = { statusCode: error.statusCode ?? 500 };
  const boom = isBoom(error) ? error : boomify(error, options);
  return {
    body: boom,
    headers: boom.output.headers,
    statusCode: boom.output.statusCode,
  };
}

export const transformCases = (
  cases: SavedObjectsFindResponse<CaseAttributes>,
  countOpenCases: number,
  countClosedCases: number,
  totalCommentByCase: ExtraCaseData[]
): CasesFindResponse => ({
  page: cases.page,
  per_page: cases.per_page,
  total: cases.total,
  cases: flattenCaseSavedObjects(cases.saved_objects, totalCommentByCase),
  count_open_cases: countOpenCases,
  count_closed_cases: countClosedCases,
});

export const flattenCaseSavedObjects = (
  savedObjects: SavedObjectsFindResponse<CaseAttributes>['saved_objects'],
  extraCaseData: ExtraCaseData[]
): CaseResponse[] =>
  savedObjects.reduce((acc: CaseResponse[], savedObject: SavedObject<CaseAttributes>) => {
    const extraDataThisCase = extraCaseData.find(tc => tc.caseId === savedObject.id);
    return [
      ...acc,
      flattenCaseSavedObject(
        savedObject,
        [],
        extraDataThisCase?.totalComments ?? 0,
        extraDataThisCase?.connectorId,
        extraDataThisCase?.caseVersion
      ),
    ];
  }, []);

export const flattenCaseSavedObject = (
  savedObject: SavedObject<CaseAttributes>,
  comments: Array<SavedObject<CommentAttributes>> = [],
  totalComment: number = 0,
  connector_id: string | null = null,
  version: string = '0'
): CaseResponse => ({
  id: savedObject.id,
  version,
  comments: flattenCommentSavedObjects(comments),
  connector_id,
  totalComment,
  ...savedObject.attributes,
});

export const transformComments = (
  comments: SavedObjectsFindResponse<CommentAttributes>
): CommentsResponse => ({
  page: comments.page,
  per_page: comments.per_page,
  total: comments.total,
  comments: flattenCommentSavedObjects(comments.saved_objects),
});

export const flattenCommentSavedObjects = (
  savedObjects: SavedObjectsFindResponse<CommentAttributes>['saved_objects']
): CommentResponse[] =>
  savedObjects.reduce((acc: CommentResponse[], savedObject: SavedObject<CommentAttributes>) => {
    return [...acc, flattenCommentSavedObject(savedObject)];
  }, []);

export const flattenCommentSavedObject = (
  savedObject: SavedObject<CommentAttributes>
): CommentResponse => ({
  id: savedObject.id,
  version: savedObject.version ?? '0',
  ...savedObject.attributes,
});

export const sortToSnake = (sortField: string): SortFieldCase => {
  switch (sortField) {
    case 'status':
      return SortFieldCase.status;
    case 'createdAt':
    case 'created_at':
      return SortFieldCase.createdAt;
    case 'closedAt':
    case 'closed_at':
      return SortFieldCase.closedAt;
    default:
      return SortFieldCase.createdAt;
  }
};

export const escapeHatch = schema.object({}, { unknowns: 'allow' });
