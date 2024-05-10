/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import { chunk } from 'lodash';
import type { SavedObjectsBulkDeleteObject } from '@kbn/core/server';
import type { FileServiceStart } from '@kbn/files-plugin/server';
import type { CasesDeleteRequest } from '../../../common/types/api';
import { CasesDeleteRequestRt } from '../../../common/types/api';
import { decodeWithExcessOrThrow } from '../../common/runtime_types';
import {
  CASE_COMMENT_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
  CASE_USER_ACTION_SAVED_OBJECT,
  MAX_FILES_PER_CASE,
  MAX_DOCS_PER_PAGE,
} from '../../../common/constants';
import type { CasesClientArgs } from '..';
import { createCaseError, createCaseErrorFromSOError, isSOError } from '../../common/error';
import type { OwnerEntity } from '../../authorization';
import { Operations } from '../../authorization';
import { createFileEntities, deleteFiles } from '../files';

/**
 * Deletes the specified cases and their attachments.
 */
export async function deleteCases(
  ids: CasesDeleteRequest,
  clientArgs: CasesClientArgs
): Promise<void> {
  const {
    services: { caseService, attachmentService, userActionService, alertsService },
    logger,
    authorization,
    fileService,
  } = clientArgs;

  try {
    const caseIds = decodeWithExcessOrThrow(CasesDeleteRequestRt)(ids);
    const cases = await caseService.getCases({ caseIds });
    const entities = new Map<string, OwnerEntity>();

    for (const theCase of cases.saved_objects) {
      // bulkGet can return an error.
      if (isSOError(theCase)) {
        throw createCaseErrorFromSOError(
          theCase.error,
          `Failed to delete cases ids: ${JSON.stringify(ids)}`
        );
      }

      entities.set(theCase.id, { id: theCase.id, owner: theCase.attributes.owner });
    }

    const fileEntities = await getFileEntities(ids, fileService);

    await authorization.ensureAuthorized({
      operation: Operations.deleteCase,
      entities: [...Array.from(entities.values()), ...fileEntities],
    });

    const attachmentIds = await attachmentService.getter.getAttachmentIdsForCases({
      caseIds: ids,
    });

    const userActionIds = await userActionService.getUserActionIdsForCases(ids);

    const bulkDeleteEntities: SavedObjectsBulkDeleteObject[] = [
      ...ids.map((id) => ({ id, type: CASE_SAVED_OBJECT })),
      ...attachmentIds.map((id) => ({ id, type: CASE_COMMENT_SAVED_OBJECT })),
      ...userActionIds.map((id) => ({ id, type: CASE_USER_ACTION_SAVED_OBJECT })),
    ];

    const fileIds = fileEntities.map((entity) => entity.id);
    await Promise.all([
      deleteFiles(fileIds, fileService),
      caseService.bulkDeleteCaseEntities({
        entities: bulkDeleteEntities,
        options: { refresh: 'wait_for' },
      }),
      alertsService.removeCaseIdsFromAllAlerts({ caseIds: ids }),
    ]);

    await userActionService.creator.bulkAuditLogCaseDeletion(
      cases.saved_objects.map((caseInfo) => caseInfo.id)
    );
  } catch (error) {
    throw createCaseError({
      message: `Failed to delete cases ids: ${JSON.stringify(ids)}: ${error}`,
      error,
      logger,
    });
  }
}

export const getFileEntities = async (
  caseIds: string[],
  fileService: FileServiceStart
): Promise<OwnerEntity[]> => {
  // using 50 just to be safe, each case can have 100 files = 50 * 100 = 5000 which is half the max number of docs that
  // the client can request
  const chunkSize = MAX_FILES_PER_CASE / 2;
  const chunkedIds = chunk(caseIds, chunkSize);

  const entityResults = await pMap(chunkedIds, async (ids: string[]) => {
    const findRes = await fileService.find({
      perPage: MAX_DOCS_PER_PAGE,
      meta: {
        caseIds: ids,
      },
    });

    const fileEntities = createFileEntities(findRes.files);
    return fileEntities;
  });

  const entities = entityResults.flatMap((res) => res);

  return entities;
};
