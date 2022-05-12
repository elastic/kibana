/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import { CaseCommentModel } from '../../common/models';
import { createCaseError } from '../../common/error';
import { CaseResponse, CommentPatchRequest } from '../../../common/api';
import { CASE_SAVED_OBJECT } from '../../../common/constants';
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
}

/**
 * Update an attachment.
 *
 * @ignore
 */
export async function update(
  { caseID, updateRequest: queryParams }: UpdateArgs,
  clientArgs: CasesClientArgs
): Promise<CaseResponse> {
  const { attachmentService, unsecuredSavedObjectsClient, logger, authorization } = clientArgs;

  try {
    const {
      id: queryCommentId,
      version: queryCommentVersion,
      ...queryRestAttributes
    } = queryParams;

    decodeCommentRequest(queryRestAttributes);

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

    const model = await CaseCommentModel.create(caseID, clientArgs);

    if (myComment.attributes.type !== queryRestAttributes.type) {
      throw Boom.badRequest(`You cannot change the type of the comment.`);
    }

    if (myComment.attributes.owner !== queryRestAttributes.owner) {
      throw Boom.badRequest(`You cannot change the owner of the comment.`);
    }

    const caseRef = myComment.references.find((c) => c.type === CASE_SAVED_OBJECT);
    if (caseRef == null || (caseRef != null && caseRef.id !== model.savedObject.id)) {
      throw Boom.notFound(
        `This comment ${queryCommentId} does not exist in ${model.savedObject.id}).`
      );
    }

    if (queryCommentVersion !== myComment.version) {
      throw Boom.conflict(
        'This case has been updated. Please refresh before saving additional updates.'
      );
    }

    const updatedDate = new Date().toISOString();

    const updatedModel = await model.updateComment({
      updateRequest: queryParams,
      updatedAt: updatedDate,
      owner: myComment.attributes.owner,
    });

    return await updatedModel.encodeWithComments();
  } catch (error) {
    throw createCaseError({
      message: `Failed to patch comment case id: ${caseID}: ${error}`,
      error,
      logger,
    });
  }
}
