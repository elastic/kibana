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
  CaseStatuses,
  CaseClientPostRequest,
  AssociationType,
  SubCaseAttributes,
  SubCaseResponse,
  CommentRequestAlertGroupType,
  ContextTypeAlertGroupRt,
  CommentAlertGroupAttributesType,
  CollectionWithSubCaseResponse,
} from '../../../common/api';
import { transformESConnectorToCaseConnector } from './cases/helpers';

import { SortFieldCase, TotalCommentByCase } from './types';
// TODO: figure out where the class should actually be stored
import { CommentableCase } from '../../common';

// TODO: refactor these functions to a common location, this is used by the caseClient too

// TODO: maybe inline this
export const transformNewSubCase = (createdAt: string): SubCaseAttributes => {
  return {
    closed_at: null,
    closed_by: null,
    created_at: createdAt,
    status: CaseStatuses.open,
    updated_at: null,
    updated_by: null,
  };
};

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
  newCase: CaseClientPostRequest;
  username?: string | null;
}): ESCaseAttributes => ({
  ...newCase,
  closed_at: null,
  closed_by: null,
  converted_by: null,
  connector,
  created_at: createdDate,
  created_by: { email, full_name, username },
  external_service: null,
  status: CaseStatuses.open,
  updated_at: null,
  updated_by: null,
});

type NewCommentArgs = CommentRequest & {
  associationType: AssociationType;
  createdDate: string;
  email?: string | null;
  full_name?: string | null;
  username?: string | null;
};

/**
 * Return the IDs from the comment.
 *
 * @param comment the comment from the add comment request
 */
export const getAlertIds = (comment: CommentRequest): string[] => {
  if (isAlertGroupContext(comment)) {
    const ids: string[] = [];
    if (Array.isArray(comment.alerts)) {
      ids.push(
        ...comment.alerts.map((alert: { _id: string }) => {
          return alert._id;
        })
      );
    } else {
      ids.push(comment.alerts._id);
    }
    return ids;
  } else if (isAlertContext(comment)) {
    return Array.isArray(comment.alertId) ? comment.alertId : [comment.alertId];
  } else {
    return [];
  }
};

export const transformNewComment = ({
  associationType,
  createdDate,
  email,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  full_name,
  username,
  ...comment
}: NewCommentArgs): CommentAttributes => {
  if (isAlertGroupContext(comment)) {
    const ids = getAlertIds(comment);

    return {
      associationType,
      alertId: ids,
      index: comment.index,
      ruleId: comment.ruleId,
      type: comment.type,
      created_at: createdDate,
      created_by: { email, full_name, username },
      pushed_at: null,
      pushed_by: null,
      updated_at: null,
      updated_by: null,
    };
  } else {
    return {
      associationType,
      ...comment,
      created_at: createdDate,
      created_by: { email, full_name, username },
      pushed_at: null,
      pushed_by: null,
      updated_at: null,
      updated_by: null,
    };
  }
};

export function wrapError(error: any): CustomHttpResponseOptions<ResponseError> {
  const options = { statusCode: error.statusCode ?? 500 };
  const boom = isBoom(error) ? error : boomify(error, options);
  return {
    body: boom,
    headers: boom.output.headers as { [key: string]: string },
    statusCode: boom.output.statusCode,
  };
}

export const transformCases = ({
  casesMap,
  countOpenCases,
  countInProgressCases,
  countClosedCases,
  page,
  perPage,
  total,
}: {
  casesMap: Map<string, CaseResponse>;
  countOpenCases: number;
  countInProgressCases: number;
  countClosedCases: number;
  page: number;
  perPage: number;
  total: number;
}): CasesFindResponse => ({
  page,
  per_page: perPage,
  total,
  cases: Array.from(casesMap.values()),
  count_open_cases: countOpenCases,
  count_in_progress_cases: countInProgressCases,
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
  totalAlerts = 0,
  subCases,
}: {
  savedObject: SavedObject<ESCaseAttributes>;
  comments?: Array<SavedObject<CommentAttributes>>;
  totalComment?: number;
  totalAlerts?: number;
  subCases?: SubCaseResponse[];
}): CaseResponse => ({
  id: savedObject.id,
  version: savedObject.version ?? '0',
  comments: flattenCommentSavedObjects(comments),
  totalComment,
  totalAlerts,
  ...savedObject.attributes,
  connector: transformESConnectorToCaseConnector(savedObject.attributes.connector),
  subCases,
});

export const flattenCommentableCaseSavedObject = ({
  combinedCase,
  comments = [],
  totalComment = comments.length,
}: {
  combinedCase: CommentableCase;
  comments?: Array<SavedObject<CommentAttributes>>;
  totalComment?: number;
  totalAlerts?: number;
}): CollectionWithSubCaseResponse => ({
  id: combinedCase.id,
  version: combinedCase.version ?? '0',
  comments: flattenCommentSavedObjects(comments),
  totalComment,
  ...combinedCase.attributes,
});

export const flattenSubCaseSavedObject = ({
  savedObject,
  comments = [],
  totalComment = comments.length,
  totalAlerts = 0,
}: {
  savedObject: SavedObject<SubCaseAttributes>;
  comments?: Array<SavedObject<CommentAttributes>>;
  totalComment?: number;
  totalAlerts?: number;
}): SubCaseResponse => ({
  id: savedObject.id,
  version: savedObject.version ?? '0',
  comments: flattenCommentSavedObjects(comments),
  totalComment,
  totalAlerts,
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

export const sortToSnake = (sortField: string | undefined): SortFieldCase => {
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

const isUserContext = (
  context: CommentRequest | CommentAttributes
): context is CommentRequestUserType => {
  return context.type === CommentType.user;
};

const isAlertContext = (
  context: CommentRequest | CommentAttributes
): context is CommentRequestAlertType => {
  return context.type === CommentType.alert;
};

export const isAlertGroupContext = (
  context: CommentRequest
): context is CommentRequestAlertGroupType => {
  return context.type === CommentType.alertGroup;
};

export const decodeComment = (comment: CommentRequest) => {
  if (isUserContext(comment)) {
    pipe(excess(ContextTypeUserRt).decode(comment), fold(throwErrors(badRequest), identity));
  } else if (isAlertContext(comment)) {
    pipe(excess(ContextTypeAlertRt).decode(comment), fold(throwErrors(badRequest), identity));
  } else if (isAlertGroupContext(comment)) {
    pipe(excess(ContextTypeAlertGroupRt).decode(comment), fold(throwErrors(badRequest), identity));
  }
};

export const getCommentContextFromAttributes = (
  attributes: CommentAttributes
): CommentRequestUserType | CommentRequestAlertType | CommentAlertGroupAttributesType =>
  isUserContext(attributes)
    ? {
        type: CommentType.user,
        comment: attributes.comment,
      }
    : isAlertContext(attributes)
    ? {
        type: CommentType.alert,
        alertId: attributes.alertId,
        index: attributes.index,
      }
    : {
        type: CommentType.alertGroup,
        alertId: attributes.alertId,
        index: attributes.index,
        ruleId: attributes.ruleId,
      };
