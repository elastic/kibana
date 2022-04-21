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

import { SavedObjectsUtils } from '../../../../../../src/core/server';

import {
  BulkCreateCommentRequest,
  BulkCreateCommentRequestRt,
  CaseResponse,
  CommentRequest,
  throwErrors,
} from '../../../common/api';

import { CaseCommentModel } from '../../common/models';
import { createCaseError } from '../../common/error';
import { CasesClientArgs } from '..';

import { decodeCommentRequest } from '../utils';
import { Operations, OwnerEntity } from '../../authorization';

export interface BulkCreateArgs {
  caseId: string;
  attachments: BulkCreateCommentRequest;
}

/**
 * Create an attachment to a case.
 *
 * @ignore
 */
export const bulkCreate = async (
  args: BulkCreateArgs,
  clientArgs: CasesClientArgs
): Promise<CaseResponse> => {
  const { attachments, caseId } = args;

  pipe(
    BulkCreateCommentRequestRt.decode(attachments),
    fold(throwErrors(Boom.badRequest), identity)
  );

  attachments.forEach((attachment) => {
    decodeCommentRequest(attachment);
  });

  const { logger, authorization } = clientArgs;

  try {
    const [attachmentsWithIds, entities]: [Array<{ id: string } & CommentRequest>, OwnerEntity[]] =
      attachments.reduce<[Array<{ id: string } & CommentRequest>, OwnerEntity[]]>(
        ([a, e], attachment) => {
          const savedObjectID = SavedObjectsUtils.generateId();
          return [
            [...a, { id: savedObjectID, ...attachment }],
            [...e, { owner: attachment.owner, id: savedObjectID }],
          ];
        },
        [[], []]
      );

    await authorization.ensureAuthorized({
      operation: Operations.createComment,
      entities,
    });

    const model = await CaseCommentModel.create(caseId, clientArgs);
    const updatedModel = await model.bulkCreate({
      attachments: attachmentsWithIds,
    });

    return await updatedModel.encodeWithComments();
  } catch (error) {
    throw createCaseError({
      message: `Failed while bulk creating attachment to case id: ${caseId} error: ${error}`,
      error,
      logger,
    });
  }
};
