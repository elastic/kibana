/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Boom from '@hapi/boom';
import { SavedObject, SavedObjectsFindResponse } from 'kibana/server';

import {
  AlertResponse,
  AllCommentsResponse,
  AllCommentsResponseRt,
  AssociationType,
  AttributesTypeAlerts,
  CommentAttributes,
  CommentResponse,
  CommentResponseRt,
  CommentsResponse,
  CommentsResponseRt,
  FindQueryParams,
} from '../../../common/api';
import { ENABLE_CASE_CONNECTOR } from '../../../common/constants';
import {
  checkEnabledCaseConnectorOrThrow,
  defaultSortField,
  transformComments,
  flattenCommentSavedObject,
  flattenCommentSavedObjects,
  getIDsAndIndicesAsArrays,
} from '../../common/utils';
import { createCaseError } from '../../common/error';
import { defaultPage, defaultPerPage } from '../../routes/api';
import { CasesClientArgs } from '../types';
import { combineFilters, stringToKueryNode } from '../utils';
import { Operations } from '../../authorization';
import { includeFieldsRequiredForAuthentication } from '../../authorization/utils';
import { CasesClient } from '../client';

/**
 * Parameters for finding attachments of a case
 */
export interface FindArgs {
  /**
   * The case ID for finding associated attachments
   */
  caseID: string;
  /**
   * Optional parameters for filtering the returned attachments
   */
  queryParams?: FindQueryParams;
}

/**
 * Parameters for retrieving all attachments of a case
 */
export interface GetAllArgs {
  /**
   * The case ID to retrieve all attachments for
   */
  caseID: string;
  /**
   * Optionally include the attachments associated with a sub case
   */
  includeSubCaseComments?: boolean;
  /**
   * If included the case ID will be ignored and the attachments will be retrieved from the specified ID of the sub case
   */
  subCaseID?: string;
}

export interface GetArgs {
  /**
   * The ID of the case to retrieve an attachment from
   */
  caseID: string;
  /**
   * The ID of the attachment to retrieve
   */
  attachmentID: string;
}

export interface GetAllAlertsAttachToCase {
  /**
   * The ID of the case to retrieve the alerts from
   */
  caseId: string;
}

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
 *
 * @ignore
 */
export const getAllAlertsAttachToCase = async (
  { caseId }: GetAllAlertsAttachToCase,
  clientArgs: CasesClientArgs,
  casesClient: CasesClient
): Promise<AlertResponse> => {
  const { unsecuredSavedObjectsClient, authorization, attachmentService } = clientArgs;

  // This will perform an authorization check to ensure the user has access to the parent case
  const theCase = await casesClient.cases.get({
    id: caseId,
    includeComments: false,
    includeSubCaseComments: false,
  });

  const { filter: authorizationFilter, ensureSavedObjectsAreAuthorized } =
    await authorization.getAuthorizationFilter(Operations.getAlertsAttachedToCase);

  const alerts = await attachmentService.getAllAlertsAttachToCase({
    unsecuredSavedObjectsClient,
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
};

/**
 * Retrieves the attachments for a case entity. This support pagination.
 *
 * @ignore
 */
export async function find(
  { caseID, queryParams }: FindArgs,
  clientArgs: CasesClientArgs
): Promise<CommentsResponse> {
  const { unsecuredSavedObjectsClient, caseService, logger, authorization } = clientArgs;

  try {
    checkEnabledCaseConnectorOrThrow(queryParams?.subCaseId);

    const { filter: authorizationFilter, ensureSavedObjectsAreAuthorized } =
      await authorization.getAuthorizationFilter(Operations.findComments);

    const id = queryParams?.subCaseId ?? caseID;
    const associationType = queryParams?.subCaseId ? AssociationType.subCase : AssociationType.case;
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
            page: defaultPage,
            perPage: defaultPerPage,
            sortField: 'created_at',
            filter: combinedFilter,
            ...queryWithoutFilter,
            fields,
          },
          associationType,
        }
      : {
          caseService,
          unsecuredSavedObjectsClient,
          id,
          options: {
            page: defaultPage,
            perPage: defaultPerPage,
            sortField: 'created_at',
            filter: combinedFilter,
          },
          associationType,
        };

    const theComments = await caseService.getCommentsByAssociation(args);

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
 *
 * @ignore
 */
export async function get(
  { attachmentID, caseID }: GetArgs,
  clientArgs: CasesClientArgs
): Promise<CommentResponse> {
  const { attachmentService, unsecuredSavedObjectsClient, logger, authorization } = clientArgs;

  try {
    const comment = await attachmentService.get({
      unsecuredSavedObjectsClient,
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
 * Retrieves all the attachments for a case. The `includeSubCaseComments` can be used to include the sub case comments for
 * collections. If the entity is a sub case, pass in the subCaseID.
 *
 * @ignore
 */
export async function getAll(
  { caseID, includeSubCaseComments, subCaseID }: GetAllArgs,
  clientArgs: CasesClientArgs
): Promise<AllCommentsResponse> {
  const { unsecuredSavedObjectsClient, caseService, logger, authorization } = clientArgs;

  try {
    let comments: SavedObjectsFindResponse<CommentAttributes>;

    if (
      !ENABLE_CASE_CONNECTOR &&
      (subCaseID !== undefined || includeSubCaseComments !== undefined)
    ) {
      throw Boom.badRequest(
        'The sub case id and include sub case comments fields are not supported when the case connector feature is disabled'
      );
    }

    const { filter, ensureSavedObjectsAreAuthorized } = await authorization.getAuthorizationFilter(
      Operations.getAllComments
    );

    if (subCaseID) {
      comments = await caseService.getAllSubCaseComments({
        unsecuredSavedObjectsClient,
        id: subCaseID,
        options: {
          filter,
          sortField: defaultSortField,
        },
      });
    } else {
      comments = await caseService.getAllCaseComments({
        unsecuredSavedObjectsClient,
        id: caseID,
        includeSubCaseComments,
        options: {
          filter,
          sortField: defaultSortField,
        },
      });
    }

    ensureSavedObjectsAreAuthorized(
      comments.saved_objects.map((comment) => ({ id: comment.id, owner: comment.attributes.owner }))
    );

    return AllCommentsResponseRt.encode(flattenCommentSavedObjects(comments.saved_objects));
  } catch (error) {
    throw createCaseError({
      message: `Failed to get all comments case id: ${caseID} include sub case comments: ${includeSubCaseComments} sub case id: ${subCaseID}: ${error}`,
      error,
      logger,
    });
  }
}
