/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObject } from '@kbn/core/server';

import type {
  AlertResponse,
  AllCommentsResponse,
  AttributesTypeAlerts,
  CommentResponse,
  CommentsResponse,
} from '../../../common/api';
import { AllCommentsResponseRt, CommentResponseRt, CommentsResponseRt } from '../../../common/api';
import {
  defaultSortField,
  transformComments,
  flattenCommentSavedObject,
  flattenCommentSavedObjects,
  getIDsAndIndicesAsArrays,
} from '../../common/utils';
import { createCaseError } from '../../common/error';
import { DEFAULT_PAGE, DEFAULT_PER_PAGE } from '../../routes/api';
import type { CasesClientArgs } from '../types';
import { combineFilters, stringToKueryNode } from '../utils';
import { Operations } from '../../authorization';
import { includeFieldsRequiredForAuthentication } from '../../authorization/utils';
import type { CasesClient } from '../client';
import type { FindArgs, GetAllAlertsAttachToCase, GetAllArgs, GetArgs } from './types';

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
