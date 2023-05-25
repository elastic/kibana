/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsUtils } from '@kbn/core/server';

import type { Case, CommentRequest } from '../../../common/api';
import { BulkCreateCommentRequestRt, decodeWithExcessOrThrow } from '../../../common/api';

import { CaseCommentModel } from '../../common/models';
import { createCaseError } from '../../common/error';
import type { CasesClientArgs } from '..';

import { decodeCommentRequest } from '../utils';
import type { OwnerEntity } from '../../authorization';
import { Operations } from '../../authorization';
import type { BulkCreateArgs } from './types';
import { validateRegisteredAttachments } from './validators';

/**
 * Bulk create attachments to a case.
 *
 * @ignore
 */
export const bulkCreate = async (
  args: BulkCreateArgs,
  clientArgs: CasesClientArgs
): Promise<Case> => {
  const { attachments, caseId } = args;

  decodeWithExcessOrThrow(BulkCreateCommentRequestRt)(attachments);

  const {
    logger,
    authorization,
    externalReferenceAttachmentTypeRegistry,
    persistableStateAttachmentTypeRegistry,
  } = clientArgs;

  attachments.forEach((attachment) => {
    decodeCommentRequest(attachment, externalReferenceAttachmentTypeRegistry);
    validateRegisteredAttachments({
      query: attachment,
      persistableStateAttachmentTypeRegistry,
      externalReferenceAttachmentTypeRegistry,
    });
  });

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
      operation: Operations.bulkCreateAttachments,
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
