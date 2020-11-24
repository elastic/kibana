/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { badRequest, boomify, isBoom } from '@hapi/boom';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';
import { schema } from '@kbn/config-schema';
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
  CommentResponse,
  CommentsResponse,
  CommentAttributes,
  ESCaseConnector,
  ESCaseAttributes,
  CommentRequest,
  ContextTypeUserRt,
  ContextTypeAlertRt,
  CommentRequestUserType,
  CommentRequestAlertType,
  CommentType,
  excess,
  throwErrors,
} from '../../../common/api';
import { transformESConnectorToCaseConnector } from './cases/helpers';

import { SortFieldCase, TotalCommentByCase } from './types';

export const transformNewCase = ({
  connector,
  createdDate,
  email,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  full_name,
  newCase,
  username,
}: {
  connector: ESCaseConnector;
  createdDate: string;
  email?: string | null;
  full_name?: string | null;
  newCase: CasePostRequest;
  username?: string | null;
}): ESCaseAttributes => ({
  ...newCase,
  closed_at: null,
  closed_by: null,
  connector,
  created_at: createdDate,
  created_by: { email, full_name, username },
  external_service: null,
  status: 'open',
  updated_at: null,
  updated_by: null,
});

type NewCommentArgs = CommentRequest & {
  createdDate: string;
  email?: string | null;
  full_name?: string | null;
  username?: string | null;
};

export const transformNewComment = ({
  createdDate,
  email,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  full_name,
  username,
  ...comment
}: NewCommentArgs): CommentAttributes => ({
  ...comment,
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
  cases: SavedObjectsFindResponse<ESCaseAttributes>,
  countOpenCases: number,
  countClosedCases: number,
  totalCommentByCase: TotalCommentByCase[]
): CasesFindResponse => ({
  page: cases.page,
  per_page: cases.per_page,
  total: cases.total,
  cases: flattenCaseSavedObjects(cases.saved_objects, totalCommentByCase),
  count_open_cases: countOpenCases,
  count_closed_cases: countClosedCases,
});

export const flattenCaseSavedObjects = (
  savedObjects: Array<SavedObject<ESCaseAttributes>>,
  totalCommentByCase: TotalCommentByCase[]
): CaseResponse[] =>
  savedObjects.reduce((acc: CaseResponse[], savedObject: SavedObject<ESCaseAttributes>) => {
    return [
      ...acc,
      flattenCaseSavedObject({
        savedObject,
        totalComment:
          totalCommentByCase.find((tc) => tc.caseId === savedObject.id)?.totalComments ?? 0,
      }),
    ];
  }, []);

export const flattenCaseSavedObject = ({
  savedObject,
  comments = [],
  totalComment = comments.length,
}: {
  savedObject: SavedObject<ESCaseAttributes>;
  comments?: Array<SavedObject<CommentAttributes>>;
  totalComment?: number;
}): CaseResponse => ({
  id: savedObject.id,
  version: savedObject.version ?? '0',
  comments: flattenCommentSavedObjects(comments),
  totalComment,
  ...savedObject.attributes,
  connector: transformESConnectorToCaseConnector(savedObject.attributes.connector),
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
  savedObjects: Array<SavedObject<CommentAttributes>>
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

const isUserContext = (context: CommentRequest): context is CommentRequestUserType => {
  return context.type === CommentType.user;
};

const isAlertContext = (context: CommentRequest): context is CommentRequestAlertType => {
  return context.type === CommentType.alert;
};

export const decodeComment = (comment: CommentRequest) => {
  if (isUserContext(comment)) {
    pipe(excess(ContextTypeUserRt).decode(comment), fold(throwErrors(badRequest), identity));
  } else if (isAlertContext(comment)) {
    pipe(excess(ContextTypeAlertRt).decode(comment), fold(throwErrors(badRequest), identity));
  }
};

export const getCommentContextFromAttributes = (
  attributes: CommentAttributes
): CommentRequestUserType | CommentRequestAlertType =>
  isUserContext(attributes)
    ? {
        type: CommentType.user,
        comment: attributes.comment,
      }
    : {
        type: CommentType.alert,
        alertId: attributes.alertId,
        index: attributes.index,
      };
