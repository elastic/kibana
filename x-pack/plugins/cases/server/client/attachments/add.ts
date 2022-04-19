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

import { SavedObjectsUtils } from '@kbn/core/server';

import { CaseResponse, CommentRequest, CommentRequestRt, throwErrors } from '../../../common/api';

import { CaseCommentModel } from '../../common/models';
import { createCaseError } from '../../common/error';
import { CasesClientArgs } from '..';

import { decodeCommentRequest } from '../utils';
import { Operations } from '../../authorization';

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
  clientArgs: CasesClientArgs
): Promise<CaseResponse> => {
  const { comment, caseId } = addArgs;
  const query = pipe(
    CommentRequestRt.decode(comment),
    fold(throwErrors(Boom.badRequest), identity)
  );

  const { logger, authorization } = clientArgs;

  decodeCommentRequest(comment);
  try {
    const savedObjectID = SavedObjectsUtils.generateId();

    await authorization.ensureAuthorized({
      operation: Operations.createComment,
      entities: [{ owner: comment.owner, id: savedObjectID }],
    });

    const createdDate = new Date().toISOString();

    const model = await CaseCommentModel.create(caseId, clientArgs);

    const updatedModel = await model.createComment({
      createdDate,
      commentReq: query,
      id: savedObjectID,
    });

    return await updatedModel.encodeWithComments();
  } catch (error) {
    throw createCaseError({
      message: `Failed while adding a comment to case id: ${caseId} error: ${error}`,
      error,
      logger,
    });
  }
};
