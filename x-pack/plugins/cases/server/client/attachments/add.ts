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

import type { CaseResponse } from '../../../common/api';
import { CommentRequestRt, throwErrors } from '../../../common/api';

import { CaseCommentModel } from '../../common/models';
import { createCaseError } from '../../common/error';
import type { CasesClientArgs } from '..';

import { decodeCommentRequest } from '../utils';
import { Operations } from '../../authorization';
import type { AddArgs } from './types';
import { validateRegisteredAttachments } from './validators';

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

  const {
    logger,
    authorization,
    persistableStateAttachmentTypeRegistry,
    externalReferenceAttachmentTypeRegistry,
  } = clientArgs;

  decodeCommentRequest(comment, externalReferenceAttachmentTypeRegistry);
  try {
    const savedObjectID = SavedObjectsUtils.generateId();

    await authorization.ensureAuthorized({
      operation: Operations.createComment,
      entities: [{ owner: comment.owner, id: savedObjectID }],
    });

    validateRegisteredAttachments({
      query,
      persistableStateAttachmentTypeRegistry,
      externalReferenceAttachmentTypeRegistry,
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
