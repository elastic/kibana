/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import { SavedObjectsClientContract, Logger } from 'kibana/server';
import { LensServerPluginSetup } from '../../../../lens/server';
import { CommentableCase } from '../../common/models';
import { createCaseError } from '../../common/error';
import { checkEnabledCaseConnectorOrThrow } from '../../common/utils';
import { Actions, ActionTypes, CaseResponse, CommentPatchRequest } from '../../../common/api';
import { CASE_SAVED_OBJECT, SUB_CASE_SAVED_OBJECT } from '../../../common/constants';
import { AttachmentService, CasesService } from '../../services';
import { CasesClientArgs } from '..';
import { decodeCommentRequest } from '../utils';
import { Operations } from '../../authorization';

/**
 * Parameters for updating a single attachment
 */
export interface UpdateArgs {
  /**
   * The ID of the case that is associated with this attachment
   */
  caseID: string;
  /**
   * The full attachment request with the fields updated with appropriate values
   */
  updateRequest: CommentPatchRequest;
  /**
   * The ID of a sub case, if specified a sub case will be searched for to perform the attachment update instead of on a case
   */
  subCaseID?: string;
}

interface CombinedCaseParams {
  attachmentService: AttachmentService;
  caseService: CasesService;
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  caseID: string;
  logger: Logger;
  lensEmbeddableFactory: LensServerPluginSetup['lensEmbeddableFactory'];
  subCaseId?: string;
}

async function getCommentableCase({
  attachmentService,
  caseService,
  unsecuredSavedObjectsClient,
  caseID,
  subCaseId,
  logger,
  lensEmbeddableFactory,
}: CombinedCaseParams) {
  if (subCaseId) {
    const [caseInfo, subCase] = await Promise.all([
      caseService.getCase({
        unsecuredSavedObjectsClient,
        id: caseID,
      }),
      caseService.getSubCase({
        unsecuredSavedObjectsClient,
        id: subCaseId,
      }),
    ]);
    return new CommentableCase({
      attachmentService,
      caseService,
      collection: caseInfo,
      subCase,
      unsecuredSavedObjectsClient,
      logger,
      lensEmbeddableFactory,
    });
  } else {
    const caseInfo = await caseService.getCase({
      unsecuredSavedObjectsClient,
      id: caseID,
    });
    return new CommentableCase({
      attachmentService,
      caseService,
      collection: caseInfo,
      unsecuredSavedObjectsClient,
      logger,
      lensEmbeddableFactory,
    });
  }
}

/**
 * Update an attachment.
 *
 * @ignore
 */
export async function update(
  { caseID, subCaseID, updateRequest: queryParams }: UpdateArgs,
  clientArgs: CasesClientArgs
): Promise<CaseResponse> {
  const {
    attachmentService,
    caseService,
    unsecuredSavedObjectsClient,
    logger,
    lensEmbeddableFactory,
    user,
    userActionService,
    authorization,
  } = clientArgs;

  try {
    checkEnabledCaseConnectorOrThrow(subCaseID);

    const {
      id: queryCommentId,
      version: queryCommentVersion,
      ...queryRestAttributes
    } = queryParams;

    decodeCommentRequest(queryRestAttributes);

    const commentableCase = await getCommentableCase({
      attachmentService,
      caseService,
      unsecuredSavedObjectsClient,
      caseID,
      subCaseId: subCaseID,
      logger,
      lensEmbeddableFactory,
    });

    const myComment = await attachmentService.get({
      unsecuredSavedObjectsClient,
      attachmentId: queryCommentId,
    });

    if (myComment == null) {
      throw Boom.notFound(`This comment ${queryCommentId} does not exist anymore.`);
    }

    await authorization.ensureAuthorized({
      entities: [{ owner: myComment.attributes.owner, id: myComment.id }],
      operation: Operations.updateComment,
    });

    if (myComment.attributes.type !== queryRestAttributes.type) {
      throw Boom.badRequest(`You cannot change the type of the comment.`);
    }

    if (myComment.attributes.owner !== queryRestAttributes.owner) {
      throw Boom.badRequest(`You cannot change the owner of the comment.`);
    }

    const saveObjType = subCaseID ? SUB_CASE_SAVED_OBJECT : CASE_SAVED_OBJECT;

    const caseRef = myComment.references.find((c) => c.type === saveObjType);
    if (caseRef == null || (caseRef != null && caseRef.id !== commentableCase.id)) {
      throw Boom.notFound(
        `This comment ${queryCommentId} does not exist in ${commentableCase.id}).`
      );
    }

    if (queryCommentVersion !== myComment.version) {
      throw Boom.conflict(
        'This case has been updated. Please refresh before saving additional updates.'
      );
    }

    const updatedDate = new Date().toISOString();
    const { comment: updatedComment, commentableCase: updatedCase } =
      await commentableCase.updateComment({
        updateRequest: queryParams,
        updatedAt: updatedDate,
        user,
      });

    await userActionService.createUserAction({
      type: ActionTypes.comment,
      action: Actions.update,
      unsecuredSavedObjectsClient,
      caseId: caseID,
      subCaseId: subCaseID,
      attachmentId: updatedComment.id,
      payload: { attachment: queryRestAttributes },
      user,
      owner: myComment.attributes.owner,
    });

    return await updatedCase.encode();
  } catch (error) {
    throw createCaseError({
      message: `Failed to patch comment case id: ${caseID} sub case id: ${subCaseID}: ${error}`,
      error,
      logger,
    });
  }
}
