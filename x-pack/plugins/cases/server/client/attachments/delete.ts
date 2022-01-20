/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import pMap from 'p-map';

import { SavedObject } from 'kibana/public';
import { Actions, ActionTypes, AssociationType, CommentAttributes } from '../../../common/api';
import {
  CASE_SAVED_OBJECT,
  MAX_CONCURRENT_SEARCHES,
  SUB_CASE_SAVED_OBJECT,
} from '../../../common/constants';
import { CasesClientArgs } from '../types';
import { createCaseError } from '../../common/error';
import { checkEnabledCaseConnectorOrThrow } from '../../common/utils';
import { Operations } from '../../authorization';

/**
 * Parameters for deleting all comments of a case or sub case.
 */
export interface DeleteAllArgs {
  /**
   * The case ID to delete all attachments for
   */
  caseID: string;
  /**
   * If specified the caseID will be ignored and this value will be used to find a sub case for deleting all the attachments
   */
  subCaseID?: string;
}

/**
 * Parameters for deleting a single attachment of a case or sub case.
 */
export interface DeleteArgs {
  /**
   * The case ID to delete an attachment from
   */
  caseID: string;
  /**
   * The attachment ID to delete
   */
  attachmentID: string;
  /**
   * If specified the caseID will be ignored and this value will be used to find a sub case for deleting the attachment
   */
  subCaseID?: string;
}

/**
 * Delete all comments for a case or sub case.
 *
 * @ignore
 */
export async function deleteAll(
  { caseID, subCaseID }: DeleteAllArgs,
  clientArgs: CasesClientArgs
): Promise<void> {
  const {
    user,
    unsecuredSavedObjectsClient,
    caseService,
    attachmentService,
    userActionService,
    logger,
    authorization,
  } = clientArgs;

  try {
    checkEnabledCaseConnectorOrThrow(subCaseID);

    const id = subCaseID ?? caseID;
    const comments = await caseService.getCommentsByAssociation({
      unsecuredSavedObjectsClient,
      id,
      associationType: subCaseID ? AssociationType.subCase : AssociationType.case,
    });

    if (comments.total <= 0) {
      throw Boom.notFound(`No comments found for ${id}.`);
    }

    await authorization.ensureAuthorized({
      operation: Operations.deleteAllComments,
      entities: comments.saved_objects.map((comment) => ({
        owner: comment.attributes.owner,
        id: comment.id,
      })),
    });

    const mapper = async (comment: SavedObject<CommentAttributes>) =>
      attachmentService.delete({
        unsecuredSavedObjectsClient,
        attachmentId: comment.id,
      });

    // Ensuring we don't too many concurrent deletions running.
    await pMap(comments.saved_objects, mapper, {
      concurrency: MAX_CONCURRENT_SEARCHES,
    });

    await userActionService.bulkCreateAttachmentDeletion({
      unsecuredSavedObjectsClient,
      caseId: caseID,
      subCaseId: subCaseID,
      attachments: comments.saved_objects.map((comment) => ({
        id: comment.id,
        owner: comment.attributes.owner,
        attachment: comment.attributes,
      })),
      user,
    });
  } catch (error) {
    throw createCaseError({
      message: `Failed to delete all comments case id: ${caseID} sub case id: ${subCaseID}: ${error}`,
      error,
      logger,
    });
  }
}

/**
 * Deletes an attachment
 *
 * @ignore
 */
export async function deleteComment(
  { caseID, attachmentID, subCaseID }: DeleteArgs,
  clientArgs: CasesClientArgs
) {
  const {
    user,
    unsecuredSavedObjectsClient,
    attachmentService,
    userActionService,
    logger,
    authorization,
  } = clientArgs;

  try {
    checkEnabledCaseConnectorOrThrow(subCaseID);

    const myComment = await attachmentService.get({
      unsecuredSavedObjectsClient,
      attachmentId: attachmentID,
    });

    if (myComment == null) {
      throw Boom.notFound(`This comment ${attachmentID} does not exist anymore.`);
    }

    await authorization.ensureAuthorized({
      entities: [{ owner: myComment.attributes.owner, id: myComment.id }],
      operation: Operations.deleteComment,
    });

    const type = subCaseID ? SUB_CASE_SAVED_OBJECT : CASE_SAVED_OBJECT;
    const id = subCaseID ?? caseID;

    const caseRef = myComment.references.find((c) => c.type === type);
    if (caseRef == null || (caseRef != null && caseRef.id !== id)) {
      throw Boom.notFound(`This comment ${attachmentID} does not exist in ${id}.`);
    }

    await attachmentService.delete({
      unsecuredSavedObjectsClient,
      attachmentId: attachmentID,
    });

    await userActionService.createUserAction({
      type: ActionTypes.comment,
      action: Actions.delete,
      unsecuredSavedObjectsClient,
      caseId: id,
      subCaseId: subCaseID,
      attachmentId: attachmentID,
      payload: { attachment: { ...myComment.attributes } },
      user,
      owner: myComment.attributes.owner,
    });
  } catch (error) {
    throw createCaseError({
      message: `Failed to delete comment: ${caseID} comment id: ${attachmentID} sub case id: ${subCaseID}: ${error}`,
      error,
      logger,
    });
  }
}
