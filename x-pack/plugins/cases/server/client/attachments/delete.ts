/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { CASE_SAVED_OBJECT, SUB_CASE_SAVED_OBJECT } from '../../../common/constants';

import { AssociationType } from '../../../common/api';
import { CasesClientArgs } from '../types';
import { buildCommentUserActionItem } from '../../services/user_actions/helpers';
import { createCaseError } from '../../common/error';
import { checkEnabledCaseConnectorOrThrow } from '../../common';
import { ensureAuthorized } from '../utils';
import { Operations } from '../../authorization';

/**
 * Parameters for deleting all comments of a case or sub case.
 */
export interface DeleteAllArgs {
  caseID: string;
  subCaseID?: string;
}

/**
 * Parameters for deleting a single comment of a case or sub case.
 */
export interface DeleteArgs {
  caseID: string;
  attachmentID: string;
  subCaseID?: string;
}

/**
 * Delete all comments for a case or sub case.
 */
export async function deleteAll(
  { caseID, subCaseID }: DeleteAllArgs,
  clientArgs: CasesClientArgs
): Promise<void> {
  const {
    user,
    savedObjectsClient: soClient,
    caseService,
    attachmentService,
    userActionService,
    logger,
    authorization,
    auditLogger,
  } = clientArgs;

  try {
    checkEnabledCaseConnectorOrThrow(subCaseID);

    const id = subCaseID ?? caseID;
    const comments = await caseService.getCommentsByAssociation({
      soClient,
      id,
      associationType: subCaseID ? AssociationType.subCase : AssociationType.case,
    });

    if (comments.total <= 0) {
      throw Boom.notFound(`No comments found for ${id}.`);
    }

    await ensureAuthorized({
      authorization,
      auditLogger,
      operation: Operations.deleteAllComments,
      savedObjectIDs: comments.saved_objects.map((comment) => comment.id),
      owners: comments.saved_objects.map((comment) => comment.attributes.owner),
    });

    await Promise.all(
      comments.saved_objects.map((comment) =>
        attachmentService.delete({
          soClient,
          attachmentId: comment.id,
        })
      )
    );

    const deleteDate = new Date().toISOString();

    await userActionService.bulkCreate({
      soClient,
      actions: comments.saved_objects.map((comment) =>
        buildCommentUserActionItem({
          action: 'delete',
          actionAt: deleteDate,
          actionBy: user,
          caseId: caseID,
          subCaseId: subCaseID,
          commentId: comment.id,
          fields: ['comment'],
        })
      ),
    });
  } catch (error) {
    throw createCaseError({
      message: `Failed to delete all comments case id: ${caseID} sub case id: ${subCaseID}: ${error}`,
      error,
      logger,
    });
  }
}

export async function deleteComment(
  { caseID, attachmentID, subCaseID }: DeleteArgs,
  clientArgs: CasesClientArgs
) {
  const {
    user,
    savedObjectsClient: soClient,
    attachmentService,
    userActionService,
    logger,
    authorization,
    auditLogger,
  } = clientArgs;

  try {
    checkEnabledCaseConnectorOrThrow(subCaseID);

    const deleteDate = new Date().toISOString();

    const myComment = await attachmentService.get({
      soClient,
      attachmentId: attachmentID,
    });

    if (myComment == null) {
      throw Boom.notFound(`This comment ${attachmentID} does not exist anymore.`);
    }

    await ensureAuthorized({
      authorization,
      auditLogger,
      owners: [myComment.attributes.owner],
      savedObjectIDs: [myComment.id],
      operation: Operations.deleteComment,
    });

    const type = subCaseID ? SUB_CASE_SAVED_OBJECT : CASE_SAVED_OBJECT;
    const id = subCaseID ?? caseID;

    const caseRef = myComment.references.find((c) => c.type === type);
    if (caseRef == null || (caseRef != null && caseRef.id !== id)) {
      throw Boom.notFound(`This comment ${attachmentID} does not exist in ${id}.`);
    }

    await attachmentService.delete({
      soClient,
      attachmentId: attachmentID,
    });

    await userActionService.bulkCreate({
      soClient,
      actions: [
        buildCommentUserActionItem({
          action: 'delete',
          actionAt: deleteDate,
          actionBy: user,
          caseId: id,
          subCaseId: subCaseID,
          commentId: attachmentID,
          fields: ['comment'],
        }),
      ],
    });
  } catch (error) {
    throw createCaseError({
      message: `Failed to delete comment: ${caseID} comment id: ${attachmentID} sub case id: ${subCaseID}: ${error}`,
      error,
      logger,
    });
  }
}
