/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
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
  SubCasesFindResponse,
  User,
  AlertCommentRequestRt,
} from '../../../common/api';
import { transformESConnectorToCaseConnector } from './cases/helpers';

import { SortFieldCase } from './types';

export const transformNewSubCase = ({
  createdAt,
  createdBy,
}: {
  createdAt: string;
  createdBy: User;
}): SubCaseAttributes => {
  return {
    closed_at: null,
    closed_by: null,
    created_at: createdAt,
    created_by: createdBy,
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
 * Return the alert IDs from the comment if it is an alert style comment. Otherwise return an empty array.
 */
export const getAlertIds = (comment: CommentRequest): string[] => {
  if (isCommentRequestTypeAlertOrGenAlert(comment)) {
    return Array.isArray(comment.alertId) ? comment.alertId : [comment.alertId];
  }
  return [];
};

/**
 * This structure holds the alert IDs and indices found from multiple alert comments
 */
export interface AlertInfo {
  ids: string[];
  indices: Set<string>;
}

const accumulateIndicesAndIDs = (comment: CommentAttributes, acc: AlertInfo): AlertInfo => {
  if (isCommentRequestTypeAlertOrGenAlert(comment)) {
    acc.ids.push(...getAlertIds(comment));
    const indices = Array.isArray(comment.index) ? comment.index : [comment.index];
    indices.forEach((index) => acc.indices.add(index));
  }
  return acc;
};

/**
 * Builds an AlertInfo object accumulating the alert IDs and indices for the passed in alerts.
 */
export const getAlertIndicesAndIDs = (comments: CommentAttributes[] | undefined): AlertInfo => {
  if (comments === undefined) {
    return { ids: [], indices: new Set<string>() };
  }

  return comments.reduce(
    (acc: AlertInfo, comment) => {
      return accumulateIndicesAndIDs(comment, acc);
    },
    { ids: [], indices: new Set<string>() }
  );
};

/**
 * Builds an AlertInfo object accumulating the alert IDs and indices for the passed in alert saved objects.
 */
export const getAlertIndicesAndIDsFromSO = (
  comments: SavedObjectsFindResponse<CommentAttributes> | undefined
): AlertInfo => {
  if (comments === undefined) {
    return { ids: [], indices: new Set<string>() };
  }

  return comments.saved_objects.reduce(
    (acc: AlertInfo, comment) => {
      return accumulateIndicesAndIDs(comment.attributes, acc);
    },
    { ids: [], indices: new Set<string>() }
  );
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

export const transformSubCases = ({
  subCasesMap,
  open,
  inProgress,
  closed,
  page,
  perPage,
  total,
}: {
  subCasesMap: Map<string, SubCaseResponse[]>;
  open: number;
  inProgress: number;
  closed: number;
  page: number;
  perPage: number;
  total: number;
}): SubCasesFindResponse => ({
  page,
  per_page: perPage,
  total,
  // Squish all the entries in the map together as one array
  subCases: Array.from(subCasesMap.values()).flat(),
  count_open_cases: open,
  count_in_progress_cases: inProgress,
  count_closed_cases: closed,
});

export const flattenCaseSavedObject = ({
  savedObject,
  comments = [],
  totalComment = comments.length,
  totalAlerts = 0,
  subCases,
  subCaseIds,
}: {
  savedObject: SavedObject<ESCaseAttributes>;
  comments?: Array<SavedObject<CommentAttributes>>;
  totalComment?: number;
  totalAlerts?: number;
  subCases?: SubCaseResponse[];
  subCaseIds?: string[];
}): CaseResponse => ({
  id: savedObject.id,
  version: savedObject.version ?? '0',
  comments: flattenCommentSavedObjects(comments),
  totalComment,
  totalAlerts,
  ...savedObject.attributes,
  connector: transformESConnectorToCaseConnector(savedObject.attributes.connector),
  subCases,
  subCaseIds: !isEmpty(subCaseIds) ? subCaseIds : undefined,
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

/**
 * A type narrowing function for user comments. Exporting so integration tests can use it.
 */
export const isCommentRequestTypeUser = (
  context: CommentRequest
): context is CommentRequestUserType => {
  return context.type === CommentType.user;
};

/**
 * A type narrowing function for alert comments. Exporting so integration tests can use it.
 */
export const isCommentRequestTypeAlertOrGenAlert = (
  context: CommentRequest
): context is CommentRequestAlertType => {
  return context.type === CommentType.alert || context.type === CommentType.generatedAlert;
};

/**
 * This is used to test if the posted comment is an generated alert. A generated alert will have one or many alerts.
 * An alert is essentially an object with a _id field. This differs from a regular attached alert because the _id is
 * passed directly in the request, it won't be in an object. Internally case will strip off the outer object and store
 * both a generated and user attached alert in the same structure but this function is useful to determine which
 * structure the new alert in the request has.
 */
export const isCommentRequestTypeGenAlert = (
  context: CommentRequest
): context is CommentRequestAlertType => {
  return context.type === CommentType.generatedAlert;
};

export const decodeCommentRequest = (comment: CommentRequest) => {
  if (isCommentRequestTypeUser(comment)) {
    pipe(excess(ContextTypeUserRt).decode(comment), fold(throwErrors(badRequest), identity));
  } else if (isCommentRequestTypeAlertOrGenAlert(comment)) {
    pipe(excess(AlertCommentRequestRt).decode(comment), fold(throwErrors(badRequest), identity));
  }
};
