/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import pMap from 'p-map';

import { SavedObject } from 'kibana/public';
import { Actions, ActionTypes, CommentAttributes } from '../../../common/api';
import { CASE_SAVED_OBJECT, MAX_CONCURRENT_SEARCHES } from '../../../common/constants';
import { CasesClientArgs } from '../types';
import { createCaseError } from '../../common/error';
import { Operations } from '../../authorization';

/**
 * Parameters for deleting all comments of a case.
 */
export interface DeleteAllArgs {
  /**
   * The case ID to delete all attachments for
   */
  caseID: string;
}

/**
 * Parameters for deleting a single attachment of a case.
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
}

/**
 * Delete all comments for a case.
 *
 * @ignore
 */
export async function deleteAll(
  { caseID }: DeleteAllArgs,
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
    const comments = await caseService.getAllCaseComments({
      id: caseID,
    });

    if (comments.total <= 0) {
      throw Boom.notFound(`No comments found for ${caseID}.`);
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
      attachments: comments.saved_objects.map((comment) => ({
        id: comment.id,
        owner: comment.attributes.owner,
        attachment: comment.attributes,
      })),
      user,
    });
  } catch (error) {
    throw createCaseError({
      message: `Failed to delete all comments case id: ${caseID}: ${error}`,
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
  { caseID, attachmentID }: DeleteArgs,
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

    const type = CASE_SAVED_OBJECT;
    const id = caseID;

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
      attachmentId: attachmentID,
      payload: { attachment: { ...myComment.attributes } },
      user,
      owner: myComment.attributes.owner,
    });
  } catch (error) {
    throw createCaseError({
      message: `Failed to delete comment: ${caseID} comment id: ${attachmentID}: ${error}`,
      error,
      logger,
    });
  }
}
