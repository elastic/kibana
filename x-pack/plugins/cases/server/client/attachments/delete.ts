/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { SavedObjectsClientContract } from 'kibana/server';
import { CASE_SAVED_OBJECT, SUB_CASE_SAVED_OBJECT } from '../../../common/constants';

import { AssociationType, User } from '../../../common/api';
import { CasesClientArgs } from '../types';
import { buildCommentUserActionItem } from '../../services/user_actions/helpers';
import { createCaseError } from '../../common/error';
import { checkEnabledCaseConnectorOrThrow } from '../../common';

/**
 * Parameters for deleting all comments of a case or sub case.
 */
export interface DeleteAllArgs {
  caseID: string;
  soClient: SavedObjectsClientContract;
  user: User;
  subCaseID?: string;
}

/**
 * Parameters for deleting a single comment of a case or sub case.
 */
export interface DeleteArgs {
  caseID: string;
  attachmentID: string;
  subCaseID?: string;
  soClient: SavedObjectsClientContract;
  user: User;
}

/**
 * Delete all comments for a case or sub case.
 */
export async function deleteAll(
  { caseID, subCaseID, soClient, user }: DeleteAllArgs,
  clientArgs: CasesClientArgs
): Promise<void> {
  try {
    checkEnabledCaseConnectorOrThrow(subCaseID);

    const id = subCaseID ?? caseID;
    const comments = await clientArgs.caseService.getCommentsByAssociation({
      soClient,
      id,
      associationType: subCaseID ? AssociationType.subCase : AssociationType.case,
    });

    await Promise.all(
      comments.saved_objects.map((comment) =>
        clientArgs.attachmentService.delete({
          soClient,
          attachmentId: comment.id,
        })
      )
    );

    const deleteDate = new Date().toISOString();

    await clientArgs.userActionService.bulkCreate({
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
      logger: clientArgs.logger,
    });
  }
}

export async function deleteComment(
  { caseID, user, soClient, attachmentID, subCaseID }: DeleteArgs,
  clientArgs: CasesClientArgs
) {
  try {
    checkEnabledCaseConnectorOrThrow(subCaseID);

    const deleteDate = new Date().toISOString();

    const myComment = await clientArgs.attachmentService.get({
      soClient,
      attachmentId: attachmentID,
    });

    if (myComment == null) {
      throw Boom.notFound(`This comment ${attachmentID} does not exist anymore.`);
    }

    const type = subCaseID ? SUB_CASE_SAVED_OBJECT : CASE_SAVED_OBJECT;
    const id = subCaseID ?? caseID;

    const caseRef = myComment.references.find((c) => c.type === type);
    if (caseRef == null || (caseRef != null && caseRef.id !== id)) {
      throw Boom.notFound(`This comment ${attachmentID} does not exist in ${id}).`);
    }

    await clientArgs.attachmentService.delete({
      soClient,
      attachmentId: attachmentID,
    });

    await clientArgs.userActionService.bulkCreate({
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
      message: `Failed to delete comment in route case id: ${caseID} comment id: ${attachmentID} sub case id: ${subCaseID}: ${error}`,
      error,
      logger: clientArgs.logger,
    });
  }
}
