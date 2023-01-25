/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObject, SavedObjectReference } from '@kbn/core/server';

import Boom from '@hapi/boom';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';

import { partition } from 'lodash';
import { CASE_SAVED_OBJECT, MAX_BULK_GET_ATTACHMENTS } from '../../../common/constants';
import type {
  AlertResponse,
  AllCommentsResponse,
  AttributesTypeAlerts,
  BulkGetCommentsResponse,
  CommentAttributes,
  CommentResponse,
  CommentsResponse,
} from '../../../common/api';
import {
  excess,
  throwErrors,
  BulkGetCommentsResponseRt,
  AllCommentsResponseRt,
  CommentResponseRt,
  CommentsResponseRt,
  BulkGetCommentsRequestRt,
} from '../../../common/api';
import {
  defaultSortField,
  transformComments,
  flattenCommentSavedObject,
  flattenCommentSavedObjects,
  getIDsAndIndicesAsArrays,
  asArray,
} from '../../common/utils';
import { createCaseError } from '../../common/error';
import { DEFAULT_PAGE, DEFAULT_PER_PAGE } from '../../routes/api';
import type { CasesClientArgs, SOWithErrors } from '../types';
import { combineFilters, stringToKueryNode } from '../utils';
import { Operations } from '../../authorization';
import { includeFieldsRequiredForAuthentication } from '../../authorization/utils';
import type { CasesClient } from '../client';
import type { BulkGetArgs, FindArgs, GetAllAlertsAttachToCase, GetAllArgs, GetArgs } from './types';
import type { BulkOptionalAttributes, OptionalAttributes } from '../../services/attachments/types';

const normalizeAlertResponse = (alerts: Array<SavedObject<AttributesTypeAlerts>>): AlertResponse =>
  alerts.reduce((acc: AlertResponse, alert) => {
    const { ids, indices } = getIDsAndIndicesAsArrays(alert.attributes);

    if (ids.length !== indices.length) {
      return acc;
    }

    return [
      ...acc,
      ...ids.map((id, index) => ({
        id,
        index: indices[index],
        attached_at: alert.attributes.created_at,
      })),
    ];
  }, []);

/**
 * Retrieves all alerts attached to a specific case.
 */
export const getAllAlertsAttachToCase = async (
  { caseId }: GetAllAlertsAttachToCase,
  clientArgs: CasesClientArgs,
  casesClient: CasesClient
): Promise<AlertResponse> => {
  const {
    authorization,
    services: { attachmentService },
    logger,
  } = clientArgs;

  try {
    // This will perform an authorization check to ensure the user has access to the parent case
    const theCase = await casesClient.cases.get({
      id: caseId,
      includeComments: false,
    });

    const { filter: authorizationFilter, ensureSavedObjectsAreAuthorized } =
      await authorization.getAuthorizationFilter(Operations.getAlertsAttachedToCase);

    const alerts = await attachmentService.getter.getAllAlertsAttachToCase({
      caseId: theCase.id,
      filter: authorizationFilter,
    });

    ensureSavedObjectsAreAuthorized(
      alerts.map((alert) => ({
        owner: alert.attributes.owner,
        id: alert.id,
      }))
    );

    return normalizeAlertResponse(alerts);
  } catch (error) {
    throw createCaseError({
      message: `Failed to get alerts attached to case id: ${caseId}: ${error}`,
      error,
      logger,
    });
  }
};

/**
 * Retrieves the attachments for a case entity. This support pagination.
 */
export async function find(
  { caseID, queryParams }: FindArgs,
  clientArgs: CasesClientArgs
): Promise<CommentsResponse> {
  const {
    unsecuredSavedObjectsClient,
    services: { caseService },
    logger,
    authorization,
  } = clientArgs;

  try {
    const { filter: authorizationFilter, ensureSavedObjectsAreAuthorized } =
      await authorization.getAuthorizationFilter(Operations.findComments);

    const id = caseID;
    const { filter, ...queryWithoutFilter } = queryParams ?? {};

    // if the fields property was defined, make sure we include the 'owner' field in the response
    const fields = includeFieldsRequiredForAuthentication(queryWithoutFilter.fields);

    // combine any passed in filter property and the filter for the appropriate owner
    const combinedFilter = combineFilters([stringToKueryNode(filter), authorizationFilter]);

    const args = queryParams
      ? {
          caseService,
          unsecuredSavedObjectsClient,
          id,
          options: {
            // We need this because the default behavior of getAllCaseComments is to return all the comments
            // unless the page and/or perPage is specified. Since we're spreading the query after the request can
            // still override this behavior.
            page: DEFAULT_PAGE,
            perPage: DEFAULT_PER_PAGE,
            sortField: 'created_at',
            filter: combinedFilter,
            ...queryWithoutFilter,
            fields,
          },
        }
      : {
          caseService,
          unsecuredSavedObjectsClient,
          id,
          options: {
            page: DEFAULT_PAGE,
            perPage: DEFAULT_PER_PAGE,
            sortField: 'created_at',
            filter: combinedFilter,
          },
        };

    const theComments = await caseService.getAllCaseComments(args);

    ensureSavedObjectsAreAuthorized(
      theComments.saved_objects.map((comment) => ({
        owner: comment.attributes.owner,
        id: comment.id,
      }))
    );

    return CommentsResponseRt.encode(transformComments(theComments));
  } catch (error) {
    throw createCaseError({
      message: `Failed to find comments case id: ${caseID}: ${error}`,
      error,
      logger,
    });
  }
}

/**
 * Retrieves a single attachment by its ID.
 */
export async function get(
  { attachmentID, caseID }: GetArgs,
  clientArgs: CasesClientArgs
): Promise<CommentResponse> {
  const {
    services: { attachmentService },
    logger,
    authorization,
  } = clientArgs;

  try {
    const comment = await attachmentService.getter.get({
      attachmentId: attachmentID,
    });

    await authorization.ensureAuthorized({
      entities: [{ owner: comment.attributes.owner, id: comment.id }],
      operation: Operations.getComment,
    });

    return CommentResponseRt.encode(flattenCommentSavedObject(comment));
  } catch (error) {
    throw createCaseError({
      message: `Failed to get comment case id: ${caseID} attachment id: ${attachmentID}: ${error}`,
      error,
      logger,
    });
  }
}

/**
 * Retrieves all the attachments for a case.
 */
export async function getAll(
  { caseID }: GetAllArgs,
  clientArgs: CasesClientArgs
): Promise<AllCommentsResponse> {
  const {
    services: { caseService },
    logger,
    authorization,
  } = clientArgs;

  try {
    const { filter, ensureSavedObjectsAreAuthorized } = await authorization.getAuthorizationFilter(
      Operations.getAllComments
    );

    const comments = await caseService.getAllCaseComments({
      id: caseID,
      options: {
        filter,
        sortField: defaultSortField,
      },
    });

    ensureSavedObjectsAreAuthorized(
      comments.saved_objects.map((comment) => ({ id: comment.id, owner: comment.attributes.owner }))
    );

    return AllCommentsResponseRt.encode(flattenCommentSavedObjects(comments.saved_objects));
  } catch (error) {
    throw createCaseError({
      message: `Failed to get all comments case id: ${caseID}: ${error}`,
      error,
      logger,
    });
  }
}

type AttachmentSavedObjectWithErrors = SOWithErrors<CommentAttributes>;

type AttachmentSavedObject = SavedObject<CommentAttributes>;

/**
 * Retrieves multiple attachments by id.
 */
export async function bulkGet(
  { attachmentIDs, caseID }: BulkGetArgs,
  clientArgs: CasesClientArgs
): Promise<BulkGetCommentsResponse> {
  const {
    services: { attachmentService },
    logger,
    authorization,
  } = clientArgs;

  try {
    const request = pipe(
      excess(BulkGetCommentsRequestRt).decode({ ids: attachmentIDs }),
      fold(throwErrors(Boom.badRequest), identity)
    );

    const attachmentIdsArray = asArray(request.ids);

    throwErrorIfIdsExceedTheLimit(attachmentIdsArray);

    const attachments = await attachmentService.getter.bulkGet(attachmentIdsArray);

    const { validAttachments, attachmentsWithErrors, invalidAssociationAttachments } =
      partitionAttachments(caseID, attachments);

    const { authorized: authorizedAttachments, unauthorized: unauthorizedAttachments } =
      await authorization.getAndEnsureAuthorizedEntities({
        savedObjects: validAttachments,
        operation: Operations.bulkGetAttachments,
      });

    const errors = constructErrors({
      associationErrors: invalidAssociationAttachments,
      unauthorizedAttachments,
      soBulkGetErrors: attachmentsWithErrors,
      caseId: caseID,
    });

    return BulkGetCommentsResponseRt.encode({
      attachments: flattenCommentSavedObjects(authorizedAttachments),
      errors,
    });
  } catch (error) {
    throw createCaseError({
      message: `Failed to bulk get attachments for case id: ${caseID}: ${error}`,
      error,
      logger,
    });
  }
}

const throwErrorIfIdsExceedTheLimit = (ids: string[]) => {
  if (ids.length > MAX_BULK_GET_ATTACHMENTS) {
    throw Boom.badRequest(
      `Maximum request limit of ${MAX_BULK_GET_ATTACHMENTS} attachments reached`
    );
  }
};

interface PartitionedAttachments {
  validAttachments: AttachmentSavedObject[];
  attachmentsWithErrors: AttachmentSavedObjectWithErrors;
  invalidAssociationAttachments: AttachmentSavedObject[];
}

const partitionAttachments = (
  caseId: string,
  attachments: BulkOptionalAttributes<CommentAttributes>
): PartitionedAttachments => {
  const [attachmentsWithoutErrors, errors] = partitionBySOError(attachments.saved_objects);
  const [caseAttachments, invalidAssociationAttachments] = partitionByCaseAssociation(
    caseId,
    attachmentsWithoutErrors
  );

  return {
    validAttachments: caseAttachments,
    attachmentsWithErrors: errors,
    invalidAssociationAttachments,
  };
};

const partitionBySOError = (attachments: Array<OptionalAttributes<CommentAttributes>>) =>
  partition(
    attachments,
    (attachment) => attachment.error == null && attachment.attributes != null
  ) as [AttachmentSavedObject[], AttachmentSavedObjectWithErrors];

const partitionByCaseAssociation = (caseId: string, attachments: AttachmentSavedObject[]) =>
  partition(attachments, (attachment) => {
    const ref = getCaseReference(attachment.references);

    return caseId === ref?.id;
  });

const getCaseReference = (references: SavedObjectReference[]): SavedObjectReference | undefined => {
  return references.find(
    (ref) => ref.name === `associated-${CASE_SAVED_OBJECT}` && ref.type === CASE_SAVED_OBJECT
  );
};

const constructErrors = ({
  caseId,
  soBulkGetErrors,
  associationErrors,
  unauthorizedAttachments,
}: {
  caseId: string;
  soBulkGetErrors: AttachmentSavedObjectWithErrors;
  associationErrors: AttachmentSavedObject[];
  unauthorizedAttachments: AttachmentSavedObject[];
}): BulkGetCommentsResponse['errors'] => {
  const errors: BulkGetCommentsResponse['errors'] = [];

  for (const soError of soBulkGetErrors) {
    errors.push({
      error: soError.error.error,
      message: soError.error.message,
      status: soError.error.statusCode,
      attachmentId: soError.id,
    });
  }

  for (const attachment of associationErrors) {
    errors.push({
      error: 'Bad Request',
      message: `Attachment is not attached to case id=${caseId}`,
      status: 400,
      attachmentId: attachment.id,
    });
  }

  for (const unauthorizedAttachment of unauthorizedAttachments) {
    errors.push({
      error: 'Forbidden',
      message: `Unauthorized to access attachment with owner: "${unauthorizedAttachment.attributes.owner}"`,
      status: 403,
      attachmentId: unauthorizedAttachment.id,
    });
  }

  return errors;
};
