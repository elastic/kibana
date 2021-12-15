/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import {
  SavedObjectsFindResult,
  SavedObjectsFindResponse,
  SavedObject,
  SavedObjectReference,
} from 'kibana/server';
import { flatMap, uniqWith, isEmpty, xorWith } from 'lodash';
import { AlertInfo } from './types';
import { LensServerPluginSetup } from '../../../lens/server';

import {
  AssociationType,
  CaseAttributes,
  CaseResponse,
  CasesClientPostRequest,
  CasesFindResponse,
  CaseStatuses,
  CommentAttributes,
  CommentRequest,
  CommentRequestAlertType,
  CommentRequestUserType,
  CommentResponse,
  CommentsResponse,
  CommentType,
  ConnectorTypes,
  SubCaseAttributes,
  SubCaseResponse,
  SubCasesFindResponse,
  User,
} from '../../common/api';
import { ENABLE_CASE_CONNECTOR } from '../../common/constants';
import { UpdateAlertRequest } from '../client/alerts/types';
import {
  parseCommentString,
  getLensVisualizations,
} from '../../common/utils/markdown_plugins/utils';

/**
 * Default sort field for querying saved objects.
 */
export const defaultSortField = 'created_at';

/**
 * Default unknown user
 */
export const nullUser: User = { username: null, full_name: null, email: null };

export const transformNewCase = ({
  user,
  newCase,
}: {
  user: User;
  newCase: CasesClientPostRequest;
}): CaseAttributes => ({
  ...newCase,
  closed_at: null,
  closed_by: null,
  created_at: new Date().toISOString(),
  created_by: user,
  external_service: null,
  status: CaseStatuses.open,
  updated_at: null,
  updated_by: null,
});

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
  savedObject: SavedObject<CaseAttributes>;
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

export const getIDsAndIndicesAsArrays = (
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
export const getAlertInfoFromComments = (comments: CommentRequest[] = []): AlertInfo[] =>
  comments.reduce((acc: AlertInfo[], comment) => {
    const alertInfo = getAndValidateAlertInfoFromComment(comment);
    acc.push(...alertInfo);
    return acc;
  }, []);

type NewCommentArgs = CommentRequest & {
  associationType: AssociationType;
  createdDate: string;
  owner: string;
  email?: string | null;
  full_name?: string | null;
  username?: string | null;
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
 * A type narrowing function for user comments. Exporting so integration tests can use it.
 */
export const isCommentRequestTypeUser = (
  context: CommentRequest
): context is CommentRequestUserType => {
  return context.type === CommentType.user;
};

/**
 * A type narrowing function for actions comments. Exporting so integration tests can use it.
 */
export const isCommentRequestTypeActions = (
  context: CommentRequest
): context is CommentRequestUserType => {
  return context.type === CommentType.actions;
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

/**
 * Adds the ids and indices to a map of statuses
 */
export function createAlertUpdateRequest({
  comment,
  status,
}: {
  comment: CommentRequest;
  status: CaseStatuses;
}): UpdateAlertRequest[] {
  return getAlertInfoFromComments([comment]).map((alert) => ({ ...alert, status }));
}

/**
 * Counts the total alert IDs within a single comment.
 */
export const countAlerts = (comment: SavedObjectsFindResult<CommentAttributes>) => {
  let totalAlerts = 0;
  if (
    comment.attributes.type === CommentType.alert ||
    comment.attributes.type === CommentType.generatedAlert
  ) {
    if (Array.isArray(comment.attributes.alertId)) {
      totalAlerts += comment.attributes.alertId.length;
    } else {
      totalAlerts++;
    }
  }
  return totalAlerts;
};

/**
 * Count the number of alerts for each id in the alert's references. This will result
 * in a map with entries for both the collection and the individual sub cases. So the resulting
 * size of the map will not equal the total number of sub cases.
 */
export const groupTotalAlertsByID = ({
  comments,
}: {
  comments: SavedObjectsFindResponse<CommentAttributes>;
}): Map<string, number> => {
  return comments.saved_objects.reduce((acc, alertsInfo) => {
    const alertTotalForComment = countAlerts(alertsInfo);
    for (const alert of alertsInfo.references) {
      if (alert.id) {
        const totalAlerts = acc.get(alert.id);

        if (totalAlerts !== undefined) {
          acc.set(alert.id, totalAlerts + alertTotalForComment);
        } else {
          acc.set(alert.id, alertTotalForComment);
        }
      }
    }

    return acc;
  }, new Map<string, number>());
};

/**
 * Counts the total alert IDs for a single case or sub case ID.
 */
export const countAlertsForID = ({
  comments,
  id,
}: {
  comments: SavedObjectsFindResponse<CommentAttributes>;
  id: string;
}): number | undefined => {
  return groupTotalAlertsByID({ comments }).get(id);
};

/**
 * If subCaseID is defined and the case connector feature is disabled this throws an error.
 */
export function checkEnabledCaseConnectorOrThrow(subCaseID: string | undefined) {
  if (!ENABLE_CASE_CONNECTOR && subCaseID !== undefined) {
    throw Boom.badRequest(
      'The sub case parameters are not supported when the case connector feature is disabled'
    );
  }
}

/**
 * Returns a connector that indicates that no connector was set.
 *
 * @returns the 'none' connector
 */
export const getNoneCaseConnector = () => ({
  id: 'none',
  name: 'none',
  type: ConnectorTypes.none,
  fields: null,
});

export const extractLensReferencesFromCommentString = (
  lensEmbeddableFactory: LensServerPluginSetup['lensEmbeddableFactory'],
  comment: string
): SavedObjectReference[] => {
  const extract = lensEmbeddableFactory()?.extract;

  if (extract) {
    const parsedComment = parseCommentString(comment);
    const lensVisualizations = getLensVisualizations(parsedComment.children);
    const flattenRefs = flatMap(
      lensVisualizations,
      (lensObject) => extract(lensObject)?.references ?? []
    );

    const uniqRefs = uniqWith(
      flattenRefs,
      (refA, refB) => refA.type === refB.type && refA.id === refB.id && refA.name === refB.name
    );

    return uniqRefs;
  }
  return [];
};

export const getOrUpdateLensReferences = (
  lensEmbeddableFactory: LensServerPluginSetup['lensEmbeddableFactory'],
  newComment: string,
  currentComment?: SavedObject<CommentRequestUserType>
) => {
  if (!currentComment) {
    return extractLensReferencesFromCommentString(lensEmbeddableFactory, newComment);
  }

  const savedObjectReferences = currentComment.references;
  const savedObjectLensReferences = extractLensReferencesFromCommentString(
    lensEmbeddableFactory,
    currentComment.attributes.comment
  );

  const currentNonLensReferences = xorWith(
    savedObjectReferences,
    savedObjectLensReferences,
    (refA, refB) => refA.type === refB.type && refA.id === refB.id
  );

  const newCommentLensReferences = extractLensReferencesFromCommentString(
    lensEmbeddableFactory,
    newComment
  );

  return currentNonLensReferences.concat(newCommentLensReferences);
};
