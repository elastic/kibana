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

import pMap from 'p-map';
import { partition } from 'lodash';
import type { File, FileJSON } from '@kbn/files-plugin/common';
import type { FileServiceStart } from '@kbn/files-plugin/server';
import { FileNotFoundError } from '@kbn/files-plugin/server/file_service/errors';
import { BulkDeleteFileAttachmentsRequestRt, excess, throwErrors } from '../../../common/api';
import { MAX_CONCURRENT_SEARCHES } from '../../../common/constants';
import type { CasesClientArgs } from '../types';
import { createCaseError } from '../../common/error';
import { Operations } from '../../authorization';
import type { BulkDeleteFileArgs } from './types';
import { CaseFileMetadataForDeletionRt } from '../../../common/files';
import type { CasesClient } from '../client';
import { createFileEntities, deleteFiles } from '../files';

export const bulkDeleteFileAttachments = async (
  { caseId, fileIds }: BulkDeleteFileArgs,
  clientArgs: CasesClientArgs,
  casesClient: CasesClient
) => {
  const {
    user,
    services: { attachmentService, userActionService },
    logger,
    authorization,
    fileService,
  } = clientArgs;

  try {
    const request = pipe(
      excess(BulkDeleteFileAttachmentsRequestRt).decode({ ids: fileIds }),
      fold(throwErrors(Boom.badRequest), identity)
    );

    await casesClient.cases.resolve({ id: caseId, includeComments: false });

    const fileEntities = await getFileEntities(caseId, request.ids, fileService);

    // It's possible for this to return an empty array if there was an error creating file attachments in which case the
    // file would be present but the case attachment would not
    const fileAttachments = await attachmentService.getter.getFileAttachments({
      caseId,
      fileIds: request.ids,
    });

    await authorization.ensureAuthorized({
      entities: [
        ...fileAttachments.map((attachment) => ({
          id: attachment.id,
          owner: attachment.attributes.owner,
        })),
        ...fileEntities,
      ],
      operation: Operations.deleteComment,
    });

    await Promise.all([
      deleteFiles(request.ids, fileService),
      attachmentService.bulkDelete({
        attachmentIds: fileAttachments.map((so) => so.id),
        refresh: false,
      }),
    ]);

    await userActionService.creator.bulkCreateAttachmentDeletion({
      caseId,
      attachments: fileAttachments.map((attachment) => ({
        id: attachment.id,
        owner: attachment.attributes.owner,
        attachment: attachment.attributes,
      })),
      user,
    });
  } catch (error) {
    let errorToTrack = error;

    // if it's an error from the file service let's put it in a boom so we don't loose the status code of a 404
    if (error instanceof FileNotFoundError) {
      errorToTrack = Boom.notFound(error.message);
    }

    throw createCaseError({
      message: `Failed to delete file attachments for case: ${caseId}: ${error}`,
      error: errorToTrack,
      logger,
    });
  }
};

const getFileEntities = async (
  caseId: BulkDeleteFileArgs['caseId'],
  fileIds: BulkDeleteFileArgs['fileIds'],
  fileService: FileServiceStart
) => {
  const files = await getFiles(caseId, fileIds, fileService);

  const fileEntities = createFileEntities(files);

  return fileEntities;
};

const getFiles = async (
  caseId: BulkDeleteFileArgs['caseId'],
  fileIds: BulkDeleteFileArgs['fileIds'],
  fileService: FileServiceStart
): Promise<FileJSON[]> => {
  // it's possible that we're trying to delete a file when an attachment wasn't created (for example if the create
  // attachment request failed)
  const files = await pMap(fileIds, async (fileId: string) => fileService.getById({ id: fileId }), {
    concurrency: MAX_CONCURRENT_SEARCHES,
  });

  const [validFiles, invalidFiles] = partition(files, (file) => {
    return (
      CaseFileMetadataForDeletionRt.is(file.data.meta) &&
      file.data.meta.caseIds.length === 1 &&
      file.data.meta.caseIds.includes(caseId)
    );
  }) as [File[], File[]];

  if (invalidFiles.length > 0) {
    const invalidIds = invalidFiles.map((fileInfo) => fileInfo.id);

    // I'm intentionally being vague here because it's possible an unauthorized user could attempt to delete files
    throw Boom.badRequest(`Failed to delete files because filed ids were invalid: ${invalidIds}`);
  }

  if (validFiles.length <= 0) {
    throw Boom.badRequest('Failed to find files to delete');
  }

  return validFiles.map((fileInfo) => fileInfo.data);
};
