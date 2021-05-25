/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { badRequest, Boom, boomify, isBoom } from '@hapi/boom';
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
  CasesClientPostRequest,
  AssociationType,
  SubCaseAttributes,
  SubCaseResponse,
  SubCasesFindResponse,
  User,
  AlertCommentRequestRt,
} from '../../../common';
import { transformESConnectorToCaseConnector } from './cases/helpers';

import { SortFieldCase } from './types';
import { AlertInfo } from '../../common';
import { isCaseError } from '../../common/error';

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
  newCase: CasesClientPostRequest;
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

const getIDsAndIndicesAsArrays = (
  comment: CommentRequestAlertType
): { ids: string[]; indices: string[] } => {
  return {
    ids: Array.isArray(comment.alertId) ? comment.alertId : [comment.alertId],
    indices: Array.isArray(comment.index) ? comment.index : [comment.index],
  };
};

/**
 * This functions extracts the ids and indices from an alert comment. It enforces that the alertId and index are either
 * both strings or string arrays that are the same length. If they are arrays they represent a 1-to-1 mapping of
 * id existing in an index at each position in the array. This is not ideal. Ideally an alert comment request would
 * accept an array of objects like this: Array<{id: string; index: string; ruleName: string ruleID: string}> instead.
 *
 * To reformat the alert comment request requires a migration and a breaking API change.
 */
const getAndValidateAlertInfoFromComment = (comment: CommentRequest): AlertInfo[] => {
  if (!isCommentRequestTypeAlertOrGenAlert(comment)) {
    return [];
  }

  const { ids, indices } = getIDsAndIndicesAsArrays(comment);

  if (ids.length !== indices.length) {
    return [];
  }

  return ids.map((id, index) => ({ id, index: indices[index] }));
};

/**
 * Builds an AlertInfo object accumulating the alert IDs and indices for the passed in alerts.
 */
export const getAlertInfoFromComments = (comments: CommentRequest[] | undefined): AlertInfo[] => {
  if (comments === undefined) {
    return [];
  }

  return comments.reduce((acc: AlertInfo[], comment) => {
    const alertInfo = getAndValidateAlertInfoFromComment(comment);
    acc.push(...alertInfo);
    return acc;
  }, []);
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

/**
 * Transforms an error into the correct format for a kibana response.
 */
export function wrapError(error: any): CustomHttpResponseOptions<ResponseError> {
  let boom: Boom;

  if (isCaseError(error)) {
    boom = error.boomify();
  } else {
    const options = { statusCode: error.statusCode ?? 500 };
    boom = isBoom(error) ? error : boomify(error, options);
  }

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
    const { ids, indices } = getIDsAndIndicesAsArrays(comment);

    /**
     * The alertId and index field must either be both of type string or they must both be string[] and be the same length.
     * Having a one-to-one relationship between the id and index of an alert avoids accidentally updating or
     * retrieving the wrong alert. Elasticsearch only guarantees that the _id (the field we use for alertId) to be
     * unique within a single index. So if we attempt to update or get a specific alert across multiple indices we could
     * update or receive the wrong one.
     *
     * Consider the situation where we have a alert1 with _id = '100' in index 'my-index-awesome' and also in index
     *  'my-index-hi'.
     * If we attempt to update the status of alert1 using an index pattern like `my-index-*` or even providing multiple
     * indices, there's a chance we'll accidentally update too many alerts.
     *
     * This check doesn't enforce that the API request has the correct alert ID to index relationship it just guards
     * against accidentally making a request like:
     * {
     *  alertId: [1,2,3],
     *  index: awesome,
     * }
     *
     * Instead this requires the requestor to provide:
     * {
     *  alertId: [1,2,3],
     *  index: [awesome, awesome, awesome]
     * }
     *
     * Ideally we'd change the format of the comment request to be an array of objects like:
     * {
     *  alerts: [{id: 1, index: awesome}, {id: 2, index: awesome}]
     * }
     *
     * But we'd need to also implement a migration because the saved object document currently stores the id and index
     * in separate fields.
     */
    if (ids.length !== indices.length) {
      throw badRequest(
        `Received an alert comment with ids and indices arrays of different lengths ids: ${JSON.stringify(
          ids
        )} indices: ${JSON.stringify(indices)}`
      );
    }
  }
};
