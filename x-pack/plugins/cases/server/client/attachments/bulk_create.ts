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
import { performance } from 'perf_hooks';
import type * as rt from 'io-ts';

import { SavedObjectsUtils } from '@kbn/core/server';

import { exactCheck } from '@kbn/securitysolution-io-ts-utils';
import { BulkCreateCommentRequest as BulkCreateCommentRequestZod } from '../../../common/api/cases/comment_zod';
import type { BulkCreateCommentRequest, CaseResponse, CommentRequest } from '../../../common/api';
import { BulkCreateCommentRequestRt, throwErrors } from '../../../common/api';

import { CaseCommentModel } from '../../common/models';
import { createCaseError } from '../../common/error';
import type { CasesClientArgs } from '..';

import { decodeCommentRequest } from '../utils';
import type { OwnerEntity } from '../../authorization';
import { Operations } from '../../authorization';

export interface BulkCreateArgs {
  caseId: string;
  attachments: BulkCreateCommentRequest;
}

export const decodeSchema = <T>(schema: rt.Type<T>, data: unknown): T => {
  return pipe(
    schema.decode(data),
    (decoded) => exactCheck(data, decoded),
    fold(throwErrors(Boom.badRequest), identity)
  );
};

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

  const beforeDecode = performance.now();

  // pipe(
  //   BulkCreateCommentRequestRt.decode(attachments),
  //   fold(throwErrors(Boom.badRequest), identity)
  // );

  // attachments.forEach((attachment) => {
  //   decodeCommentRequest(attachment);
  // });

  decodeSchema(BulkCreateCommentRequestRt, attachments);

  // BulkCreateCommentRequestZod.parse(attachments);

  const afterDecode = performance.now();

  const total = afterDecode - beforeDecode;
  console.log(`Performance of decode ${total} milliseconds`);

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
      message: `Failed while bulk creating attachment to case id`,
      error,
      logger,
    });
  }
};
