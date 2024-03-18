/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import type { AlertAttachmentPayload } from '../../../common/types/domain';
import { UserActionActions, UserActionTypes } from '../../../common/types/domain';
import { decodeOrThrow } from '../../common/runtime_types';
import { CASE_SAVED_OBJECT } from '../../../common/constants';
import { getAlertInfoFromComments, isCommentRequestTypeAlert } from '../../common/utils';
import type { CasesClientArgs } from '../types';
import { createCaseError } from '../../common/error';
import { Operations } from '../../authorization';
import type { DeleteAllArgs, DeleteArgs } from './types';
import type { AttachmentRequest } from '../../../common/types/api';
import { AttachmentRequestRt } from '../../../common/types/api';

/**
 * Delete all comments for a case.
 */
export async function deleteAll(
  { caseID }: DeleteAllArgs,
  clientArgs: CasesClientArgs
): Promise<void> {
  const {
    user,
    services: { caseService, attachmentService, userActionService, alertsService },
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

    const attachments = comments.saved_objects.map((comment) => comment.attributes);

    await handleAlerts({ alertsService, attachments, caseId: caseID });
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
 */
export async function deleteComment(
  { caseID, attachmentID }: DeleteArgs,
  clientArgs: CasesClientArgs
) {
  const {
    user,
    services: { attachmentService, userActionService, alertsService },
    logger,
    authorization,
  } = clientArgs;

  try {
    const attachment = await attachmentService.getter.get({
      attachmentId: attachmentID,
    });

    if (attachment == null) {
      throw Boom.notFound(`This comment ${attachmentID} does not exist anymore.`);
    }

    await authorization.ensureAuthorized({
      entities: [{ owner: attachment.attributes.owner, id: attachment.id }],
      operation: Operations.deleteComment,
    });

    const type = CASE_SAVED_OBJECT;
    const id = caseID;

    const caseRef = attachment.references.find((c) => c.type === type);
    if (caseRef == null || (caseRef != null && caseRef.id !== id)) {
      throw Boom.notFound(`This comment ${attachmentID} does not exist in ${id}.`);
    }

    await attachmentService.bulkDelete({
      attachmentIds: [attachmentID],
      refresh: false,
    });

    // we only want to store the fields related to the original request of the attachment, not fields like
    // created_at etc. So we'll use the decode to strip off the other fields. This is necessary because we don't know
    // what type of attachment this is. Depending on the type it could have various fields.
    const attachmentRequestAttributes = decodeOrThrow(AttachmentRequestRt)(attachment.attributes);

    await userActionService.creator.createUserAction({
      userAction: {
        type: UserActionTypes.comment,
        action: UserActionActions.delete,
        caseId: id,
        attachmentId: attachmentID,
        payload: { attachment: attachmentRequestAttributes },
        user,
        owner: attachment.attributes.owner,
      },
    });

    await handleAlerts({ alertsService, attachments: [attachment.attributes], caseId: id });
  } catch (error) {
    throw createCaseError({
      message: `Failed to delete comment: ${caseID} comment id: ${attachmentID}: ${error}`,
      error,
      logger,
    });
  }
}

interface HandleAlertsArgs {
  alertsService: CasesClientArgs['services']['alertsService'];
  attachments: AttachmentRequest[];
  caseId: string;
}

const handleAlerts = async ({ alertsService, attachments, caseId }: HandleAlertsArgs) => {
  const alertAttachments = attachments.filter((attachment): attachment is AlertAttachmentPayload =>
    isCommentRequestTypeAlert(attachment)
  );

  if (alertAttachments.length === 0) {
    return;
  }

  const alerts = getAlertInfoFromComments(alertAttachments);
  await alertsService.removeCaseIdFromAlerts({ alerts, caseId });
};
