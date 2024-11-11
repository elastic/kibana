/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsUtils } from '@kbn/core/server';

import type { Readable } from 'stream';
import type { Owner } from '../../../common/constants/types';
import type { Case } from '../../../common/types/domain';
import type { CasesClient, CasesClientArgs } from '..';
import type { AddFileArgs } from './types';

import { PostFileAttachmentRequestRt } from '../../../common/types/api';
import { CaseCommentModel } from '../../common/models';
import { createCaseError } from '../../common/error';
import { validateMaxUserActions } from '../../common/validators';
import { constructFileKindIdByOwner } from '../../../common/files';
import { Operations } from '../../authorization';
import { validateRegisteredAttachments } from './validators';
import { decodeWithExcessOrThrow } from '../../common/runtime_types';
import { buildAttachmentRequestFromFileJSON } from '../utils';

/**
 * Create a file attachment to a case.
 *
 * @ignore
 */
export const addFile = async (
  addFileArgs: AddFileArgs,
  clientArgs: CasesClientArgs,
  casesClient: CasesClient
): Promise<Case> => {
  const { caseId, file, filename, mimeType: mime, $abort } = addFileArgs;
  const {
    logger,
    authorization,
    persistableStateAttachmentTypeRegistry,
    externalReferenceAttachmentTypeRegistry,
    services: { userActionService },
    fileService,
  } = clientArgs;

  let createdFile;

  try {
    decodeWithExcessOrThrow(PostFileAttachmentRequestRt)({
      file,
      filename,
      mimeType: mime,
    });

    // This will perform an authorization check to ensure the user has access to the parent case
    const theCase = await casesClient.cases.get({
      id: caseId,
      includeComments: false,
    });

    const owner = theCase.owner;

    await validateMaxUserActions({ caseId, userActionService, userActionsToAdd: 1 });

    const savedObjectID = SavedObjectsUtils.generateId();

    await authorization.ensureAuthorized({
      operation: Operations.createComment,
      entities: [{ owner, id: savedObjectID }],
    });

    createdFile = await fileService.create({
      name: filename,
      mime,
      fileKind: constructFileKindIdByOwner(owner as Owner),
      meta: { caseIds: [caseId], owner: [owner] },
    });

    await createdFile.uploadContent(file as Readable, $abort);

    const commentReq = buildAttachmentRequestFromFileJSON({
      owner,
      fileMetadata: createdFile.toJSON(),
    });

    validateRegisteredAttachments({
      query: commentReq,
      persistableStateAttachmentTypeRegistry,
      externalReferenceAttachmentTypeRegistry,
    });

    const createdDate = new Date().toISOString();

    const model = await CaseCommentModel.create(caseId, clientArgs);

    const updatedModel = await model.createComment({
      createdDate,
      commentReq,
      id: savedObjectID,
    });

    return await updatedModel.encodeWithComments();
  } catch (error) {
    if (createdFile?.id) {
      await fileService.delete({ id: createdFile.id });
    }

    throw createCaseError({
      message: `Failed while adding a comment to case id: ${caseId} error: ${error}`,
      error,
      logger,
    });
  }
};
