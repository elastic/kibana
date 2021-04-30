/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash/fp';
import Boom from '@hapi/boom';

import { SavedObjectsClientContract, Logger } from 'kibana/server';
import { checkEnabledCaseConnectorOrThrow, CommentableCase } from '../../common';
import { buildCommentUserActionItem } from '../../services/user_actions/helpers';
import { CASE_SAVED_OBJECT, SUB_CASE_SAVED_OBJECT } from '../../../common/constants';
import { AttachmentService, CaseService } from '../../services';
import { CaseResponse, CommentPatchRequest } from '../../../common/api';
import { CasesClientArgs } from '..';
import { decodeCommentRequest, ensureAuthorized } from '../utils';
import { createCaseError } from '../../common/error';
import { Operations } from '../../authorization';

export interface UpdateArgs {
  caseID: string;
  updateRequest: CommentPatchRequest;
  subCaseID?: string;
}

interface CombinedCaseParams {
  attachmentService: AttachmentService;
  caseService: CaseService;
  soClient: SavedObjectsClientContract;
  caseID: string;
  logger: Logger;
  subCaseId?: string;
}

async function getCommentableCase({
  attachmentService,
  caseService,
  soClient,
  caseID,
  subCaseId,
  logger,
}: CombinedCaseParams) {
  if (subCaseId) {
    const [caseInfo, subCase] = await Promise.all([
      caseService.getCase({
        soClient,
        id: caseID,
      }),
      caseService.getSubCase({
        soClient,
        id: subCaseId,
      }),
    ]);
    return new CommentableCase({
      attachmentService,
      caseService,
      collection: caseInfo,
      subCase,
      soClient,
      logger,
    });
  } else {
    const caseInfo = await caseService.getCase({
      soClient,
      id: caseID,
    });
    return new CommentableCase({
      attachmentService,
      caseService,
      collection: caseInfo,
      soClient,
      logger,
    });
  }
}

/**
 * Update an attachment.
 */
export async function update(
  { caseID, subCaseID, updateRequest: queryParams }: UpdateArgs,
  clientArgs: CasesClientArgs
): Promise<CaseResponse> {
  const {
    attachmentService,
    caseService,
    savedObjectsClient: soClient,
    logger,
    user,
    userActionService,
    authorization,
    auditLogger,
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
      soClient,
      caseID,
      subCaseId: subCaseID,
      logger,
    });

    const myComment = await attachmentService.get({
      soClient,
      attachmentId: queryCommentId,
    });

    if (myComment == null) {
      throw Boom.notFound(`This comment ${queryCommentId} does not exist anymore.`);
    }

    await ensureAuthorized({
      authorization,
      auditLogger,
      operation: Operations.updateComment,
      savedObjectIDs: [myComment.id],
      owners: [myComment.attributes.owner],
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
    const {
      comment: updatedComment,
      commentableCase: updatedCase,
    } = await commentableCase.updateComment({
      updateRequest: queryParams,
      updatedAt: updatedDate,
      user,
    });

    await userActionService.bulkCreate({
      soClient,
      actions: [
        buildCommentUserActionItem({
          action: 'update',
          actionAt: updatedDate,
          actionBy: user,
          caseId: caseID,
          subCaseId: subCaseID,
          commentId: updatedComment.id,
          fields: ['comment'],
          newValue: JSON.stringify(queryRestAttributes),
          oldValue: JSON.stringify(
            // We are interested only in ContextBasicRt attributes
            // myComment.attribute contains also CommentAttributesBasicRt attributes
            pick(Object.keys(queryRestAttributes), myComment.attributes)
          ),
          owner: myComment.attributes.owner,
        }),
      ],
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
