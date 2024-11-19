/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';

import type {
  AlertAttachmentAttributes,
  Attachment,
  Attachments,
} from '../../../common/types/domain';
import { AttachmentType } from '../../../common';
import type { AlertResponse, AttachmentsFindResponse } from '../../../common/types/api';
import {
  AlertResponseRt,
  FindAttachmentsQueryParamsRt,
  AttachmentsFindResponseRt,
} from '../../../common/types/api';
import type { CasesClient } from '../client';
import type { CasesClientArgs } from '../types';

import type { FindCommentsArgs, GetAllAlertsAttachToCase, GetAllArgs, GetArgs } from './types';

import { CASE_COMMENT_SAVED_OBJECT, CASE_SAVED_OBJECT } from '../../../common/constants';
import { decodeOrThrow, decodeWithExcessOrThrow } from '../../common/runtime_types';
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
import { AttachmentRt, AttachmentsRt } from '../../../common/types/domain';

const normalizeAlertResponse = (
  alerts: Array<SavedObject<AlertAttachmentAttributes>>
): AlertResponse =>
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

    const res = normalizeAlertResponse(alerts);

    return decodeOrThrow(AlertResponseRt)(res);
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
  { caseID, findQueryParams }: FindCommentsArgs,
  clientArgs: CasesClientArgs
): Promise<AttachmentsFindResponse> {
  const {
    services: { attachmentService },
    logger,
    authorization,
  } = clientArgs;

  try {
    const queryParams = decodeWithExcessOrThrow(FindAttachmentsQueryParamsRt)(findQueryParams);

    const { filter: authorizationFilter, ensureSavedObjectsAreAuthorized } =
      await authorization.getAuthorizationFilter(Operations.findComments);

    const filter = combineFilters([
      buildFilter({
        filters: [AttachmentType.user],
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

    const res = transformComments(theComments);

    return decodeOrThrow(AttachmentsFindResponseRt)(res);
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
): Promise<Attachment> {
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

    const res = flattenCommentSavedObject(comment);

    return decodeOrThrow(AttachmentRt)(res);
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
): Promise<Attachments> {
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

    const res = flattenCommentSavedObjects(comments.saved_objects);

    return decodeOrThrow(AttachmentsRt)(res);
  } catch (error) {
    throw createCaseError({
      message: `Failed to get all comments case id: ${caseID}: ${error}`,
      error,
      logger,
    });
  }
}
