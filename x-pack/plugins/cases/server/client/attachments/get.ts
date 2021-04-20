/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Boom from '@hapi/boom';
import * as rt from 'io-ts';
import { SavedObjectsFindResponse } from 'kibana/server';
import { ENABLE_CASE_CONNECTOR } from '../../../common/constants';

import { esKuery } from '../../../../../../src/plugins/data/server';
import {
  AllCommentsResponse,
  AllCommentsResponseRt,
  AssociationType,
  CommentAttributes,
  CommentResponse,
  CommentResponseRt,
  CommentsResponse,
  CommentsResponseRt,
  SavedObjectFindOptionsRt,
} from '../../../common/api';
import {
  checkEnabledCaseConnectorOrThrow,
  defaultSortField,
  transformComments,
  flattenCommentSavedObject,
  flattenCommentSavedObjects,
} from '../../common';
import { createCaseError } from '../../common/error';
import { defaultPage, defaultPerPage } from '../../routes/api';
import { CasesClientArgs } from '../types';
import { ensureAuthorized, getAuthorizationFilter } from '../utils';
import { Operations } from '../../authorization';

const FindQueryParamsRt = rt.partial({
  ...SavedObjectFindOptionsRt.props,
  subCaseId: rt.string,
});

type FindQueryParams = rt.TypeOf<typeof FindQueryParamsRt>;

export interface FindArgs {
  caseID: string;
  queryParams?: FindQueryParams;
}

export interface GetAllArgs {
  caseID: string;
  includeSubCaseComments?: boolean;
  subCaseID?: string;
  owner?: string;
}

export interface GetArgs {
  caseID: string;
  attachmentID: string;
}

/**
 * Retrieves the attachments for a case entity. This support pagination.
 */
export async function find(
  { caseID, queryParams }: FindArgs,
  { savedObjectsClient: soClient, caseService, logger }: CasesClientArgs
): Promise<CommentsResponse> {
  try {
    checkEnabledCaseConnectorOrThrow(queryParams?.subCaseId);

    const id = queryParams?.subCaseId ?? caseID;
    const associationType = queryParams?.subCaseId ? AssociationType.subCase : AssociationType.case;
    const { filter, ...queryWithoutFilter } = queryParams ?? {};
    const args = queryParams
      ? {
          caseService,
          soClient,
          id,
          options: {
            // We need this because the default behavior of getAllCaseComments is to return all the comments
            // unless the page and/or perPage is specified. Since we're spreading the query after the request can
            // still override this behavior.
            page: defaultPage,
            perPage: defaultPerPage,
            sortField: 'created_at',
            filter: filter != null ? esKuery.fromKueryExpression(filter) : filter,
            ...queryWithoutFilter,
          },
          associationType,
        }
      : {
          caseService,
          soClient,
          id,
          options: {
            page: defaultPage,
            perPage: defaultPerPage,
            sortField: 'created_at',
          },
          associationType,
        };

    const theComments = await caseService.getCommentsByAssociation(args);
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
    attachmentService,
    savedObjectsClient: soClient,
    logger,
    authorization,
    auditLogger,
  } = clientArgs;

  try {
    const comment = await attachmentService.get({
      soClient,
      attachmentId: attachmentID,
    });

    await ensureAuthorized({
      authorization,
      auditLogger,
      owners: [comment.attributes.owner],
      savedObjectIDs: [comment.id],
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
 */
export async function getAll(
  { caseID, includeSubCaseComments, subCaseID, owner }: GetAllArgs,
  clientArgs: CasesClientArgs
): Promise<AllCommentsResponse> {
  const {
    savedObjectsClient: soClient,
    caseService,
    logger,
    authorization,
    auditLogger,
  } = clientArgs;

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

    // TODO: finish this call combineFieldWithKueryNodeFilter
    const {
      filter,
      ensureSavedObjectsAreAuthorized,
      logSuccessfulAuthorization,
    } = getAuthorizationFilter({
      authorization,
      auditLogger,
      operation: Operations.getAllComments,
    });

    if (subCaseID) {
      comments = await caseService.getAllSubCaseComments({
        soClient,
        id: subCaseID,
        options: {
          sortField: defaultSortField,
        },
      });
    } else {
      comments = await caseService.getAllCaseComments({
        soClient,
        id: caseID,
        includeSubCaseComments,
        options: {
          sortField: defaultSortField,
        },
      });
    }

    return AllCommentsResponseRt.encode(flattenCommentSavedObjects(comments.saved_objects));
  } catch (error) {
    throw createCaseError({
      message: `Failed to get all comments case id: ${caseID} include sub case comments: ${includeSubCaseComments} sub case id: ${subCaseID}: ${error}`,
      error,
      logger,
    });
  }
}
