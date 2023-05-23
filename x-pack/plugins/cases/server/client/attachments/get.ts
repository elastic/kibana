/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';

import type { SavedObject } from '@kbn/core/server';

import type { CasesClient } from '../client';
import type { CasesClientArgs } from '../types';
import type {
  AlertResponse,
  Comments,
  AttributesTypeAlerts,
  Comment,
  CommentsFindResponse,
} from '../../../common/api';
import type { FindCommentsArgs, GetAllAlertsAttachToCase, GetAllArgs, GetArgs } from './types';

import { CASE_COMMENT_SAVED_OBJECT, CASE_SAVED_OBJECT } from '../../../common/constants';
import {
  FindCommentsArgsRt,
  CommentType,
  CommentsRt,
  CommentRt,
  CommentsFindResponseRt,
  excess,
  throwErrors,
} from '../../../common/api';
import {
  defaultSortField,
  transformComments,
  flattenCommentSavedObject,
  flattenCommentSavedObjects,
  getIDsAndIndicesAsArrays,
} from '../../common/utils';
import { createCaseError } from '../../common/error';
import { DEFAULT_PAGE, DEFAULT_PER_PAGE } from '../../routes/api';
import { buildFilter, combineFilters } from '../utils';
import { Operations } from '../../authorization';
import { validateFindCommentsPagination } from './validators';

const normalizeAlertResponse = (alerts: Array<SavedObject<AttributesTypeAlerts>>): AlertResponse =>
  alerts.reduce((acc: AlertResponse, alert) => {
    const { ids, indices } = getIDsAndIndicesAsArrays(alert.attributes);

    if (ids.length !== indices.length) {
      return acc;
    }

    acc.push(
      ...ids.map((id, index) => ({
        id,
        index: indices[index],
        attached_at: alert.attributes.created_at,
      }))
    );
    return acc;
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
  data: FindCommentsArgs,
  clientArgs: CasesClientArgs
): Promise<CommentsFindResponse> {
  const {
    services: { attachmentService },
    logger,
    authorization,
  } = clientArgs;

  const { caseID, queryParams } = pipe(
    excess(FindCommentsArgsRt).decode(data),
    fold(throwErrors(Boom.badRequest), identity)
  );

  validateFindCommentsPagination(queryParams);

  try {
    const { filter: authorizationFilter, ensureSavedObjectsAreAuthorized } =
      await authorization.getAuthorizationFilter(Operations.findComments);

    const filter = combineFilters([
      buildFilter({
        filters: [CommentType.user],
        field: 'type',
        operator: 'or',
        type: CASE_COMMENT_SAVED_OBJECT,
      }),
      authorizationFilter,
    ]);

    const theComments = await attachmentService.find({
      options: {
        page: queryParams?.page ?? DEFAULT_PAGE,
        perPage: queryParams?.perPage ?? DEFAULT_PER_PAGE,
        ...(queryParams?.sortOrder && { sortOrder: queryParams?.sortOrder }),
        sortField: 'created_at',
        hasReference: { type: CASE_SAVED_OBJECT, id: caseID },
        filter,
      },
    });

    ensureSavedObjectsAreAuthorized(
      theComments.saved_objects.map((comment) => ({
        owner: comment.attributes.owner,
        id: comment.id,
      }))
    );

    return CommentsFindResponseRt.encode(transformComments(theComments));
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
): Promise<Comment> {
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

    return CommentRt.encode(flattenCommentSavedObject(comment));
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
): Promise<Comments> {
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

    return CommentsRt.encode(flattenCommentSavedObjects(comments.saved_objects));
  } catch (error) {
    throw createCaseError({
      message: `Failed to get all comments case id: ${caseID}: ${error}`,
      error,
      logger,
    });
  }
}
