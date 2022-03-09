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

import {
  SavedObjectsClientContract,
  Logger,
  SavedObjectsUtils,
} from '../../../../../../src/core/server';
import { LensServerPluginSetup } from '../../../../lens/server';

import {
  Actions,
  ActionTypes,
  CaseResponse,
  CommentRequest,
  CommentRequestRt,
  CommentType,
  throwErrors,
  User,
} from '../../../common/api';

import { AttachmentService, CasesService } from '../../services';
import { CommentableCase } from '../../common/models';
import { createCaseError } from '../../common/error';
import { createAlertUpdateRequest } from '../../common/utils';
import { CasesClientArgs, CasesClientInternal } from '..';

import { decodeCommentRequest } from '../utils';
import { Operations } from '../../authorization';

async function createCommentableCase({
  caseService,
  attachmentService,
  unsecuredSavedObjectsClient,
  id,
  logger,
  lensEmbeddableFactory,
}: {
  caseService: CasesService;
  attachmentService: AttachmentService;
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  id: string;
  logger: Logger;
  lensEmbeddableFactory: LensServerPluginSetup['lensEmbeddableFactory'];
}): Promise<CommentableCase> {
  const caseInfo = await caseService.getCase({
    id,
  });

  return new CommentableCase({
    logger,
    caseInfo,
    caseService,
    attachmentService,
    unsecuredSavedObjectsClient,
    lensEmbeddableFactory,
  });
}

/**
 * The arguments needed for creating a new attachment to a case.
 */
export interface AddArgs {
  /**
   * The case ID that this attachment will be associated with
   */
  caseId: string;
  /**
   * The attachment values.
   */
  comment: CommentRequest;
}

/**
 * Create an attachment to a case.
 *
 * @ignore
 */
export const addComment = async (
  addArgs: AddArgs,
  clientArgs: CasesClientArgs,
  casesClientInternal: CasesClientInternal
): Promise<CaseResponse> => {
  const { comment, caseId } = addArgs;
  const query = pipe(
    CommentRequestRt.decode(comment),
    fold(throwErrors(Boom.badRequest), identity)
  );

  const {
    unsecuredSavedObjectsClient,
    caseService,
    userActionService,
    attachmentService,
    user,
    logger,
    lensEmbeddableFactory,
    authorization,
    alertsService,
  } = clientArgs;

  decodeCommentRequest(comment);
  try {
    const savedObjectID = SavedObjectsUtils.generateId();

    await authorization.ensureAuthorized({
      operation: Operations.createComment,
      entities: [{ owner: comment.owner, id: savedObjectID }],
    });

    const createdDate = new Date().toISOString();

    const combinedCase = await createCommentableCase({
      caseService,
      attachmentService,
      unsecuredSavedObjectsClient,
      id: caseId,
      logger,
      lensEmbeddableFactory,
    });

    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { username, full_name, email } = user;
    const userInfo: User = {
      username,
      full_name,
      email,
    };

    const { comment: newComment, commentableCase: updatedCase } = await combinedCase.createComment({
      createdDate,
      user: userInfo,
      commentReq: query,
      id: savedObjectID,
    });

    if (newComment.attributes.type === CommentType.alert && updatedCase.settings.syncAlerts) {
      const alertsToUpdate = createAlertUpdateRequest({
        comment: query,
        status: updatedCase.status,
      });

      await alertsService.updateAlertsStatus(alertsToUpdate);
    }

    await userActionService.createUserAction({
      type: ActionTypes.comment,
      action: Actions.create,
      unsecuredSavedObjectsClient,
      caseId,
      attachmentId: newComment.id,
      payload: {
        attachment: query,
      },
      user,
      owner: newComment.attributes.owner,
    });

    return updatedCase.encode();
  } catch (error) {
    throw createCaseError({
      message: `Failed while adding a comment to case id: ${caseId} error: ${error}`,
      error,
      logger,
    });
  }
};
