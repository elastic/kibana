/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import { Actions, ActionTypes } from '../../../common/api';
import { CASE_SAVED_OBJECT } from '../../../common/constants';
import type { CasesClientArgs } from '../types';
import { createCaseError } from '../../common/error';
import { Operations } from '../../authorization';
import type { DeleteAllArgs, DeleteArgs, DeleteFileArgs } from './types';

/**
 * Delete all comments for a case.
 */
export async function deleteAll(
  { caseID }: DeleteAllArgs,
  clientArgs: CasesClientArgs
): Promise<void> {
  const {
    user,
    services: { caseService, attachmentService, userActionService },
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

    await attachmentService.bulkDelete({
      attachmentIds: comments.saved_objects.map((so) => so.id),
      refresh: false,
    });

    await userActionService.creator.bulkCreateAttachmentDeletion({
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

export const deleteFileAttachments = async (
  { caseId, fileId }: DeleteFileArgs,
  clientArgs: CasesClientArgs
) => {
  const {
    user,
    services: { attachmentService, userActionService },
    logger,
    authorization,
  } = clientArgs;

  try {
    const fileAttachments = await attachmentService.getter.getFileAttachmentIds({ caseId, fileId });

    if (fileAttachments.length <= 0) {
      throw Boom.notFound(`No case attachments were found using file id: ${fileId}`);
    }

    await authorization.ensureAuthorized({
      entities: fileAttachments.map((attachment) => ({
        id: attachment.id,
        owner: attachment.attributes.owner,
      })),
      operation: Operations.deleteComment,
    });

    await attachmentService.bulkDelete({
      attachmentIds: fileAttachments.map((so) => so.id),
      refresh: false,
    });

    await userActionService.creator.bulkCreateAttachmentDeletion({
      caseId,
      attachments: fileAttachments.map((attachment) => ({
        id: attachment.id,
        owner: attachment.attributes.owner,
        attachment: attachment.attributes,
      })),
      user,
    });
  } catch (error) {
    throw createCaseError({
      message: `Failed to delete file attachments for case: ${caseId} file id: ${fileId}: ${error}`,
      error,
      logger,
    });
  }
};

/**
 * Deletes an attachment
 */
export async function deleteComment(
  { caseID, attachmentID }: DeleteArgs,
  clientArgs: CasesClientArgs
) {
  const {
    user,
    services: { attachmentService, userActionService },
    logger,
    authorization,
  } = clientArgs;

  try {
    const myComment = await attachmentService.getter.get({
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

    await attachmentService.bulkDelete({
      attachmentIds: [attachmentID],
      refresh: false,
    });

    await userActionService.creator.createUserAction({
      type: ActionTypes.comment,
      action: Actions.delete,
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
