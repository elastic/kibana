/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Boom } from '@hapi/boom';
import type { SavedObjectsBulkDeleteObject } from '@kbn/core/server';
import {
  CASE_COMMENT_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
  CASE_USER_ACTION_SAVED_OBJECT,
} from '../../../common/constants';
import type { CasesClientArgs } from '..';
import { createCaseError } from '../../common/error';
import type { OwnerEntity } from '../../authorization';
import { Operations } from '../../authorization';

/**
 * Deletes the specified cases and their attachments.
 *
 * @ignore
 */
export async function deleteCases(ids: string[], clientArgs: CasesClientArgs): Promise<void> {
  const {
    unsecuredSavedObjectsClient,
    services: { caseService, attachmentService, userActionService },
    logger,
    authorization,
  } = clientArgs;
  try {
    const cases = await caseService.getCases({ caseIds: ids });
    const entities = new Map<string, OwnerEntity>();

    for (const theCase of cases.saved_objects) {
      // bulkGet can return an error.
      if (theCase.error != null) {
        throw createCaseError({
          message: `Failed to delete cases ids: ${JSON.stringify(ids)}: ${theCase.error.error}`,
          error: new Boom(theCase.error.message, { statusCode: theCase.error.statusCode }),
          logger,
        });
      }
      entities.set(theCase.id, { id: theCase.id, owner: theCase.attributes.owner });
    }

    await authorization.ensureAuthorized({
      operation: Operations.deleteCase,
      entities: Array.from(entities.values()),
    });

    const attachmentIds = await attachmentService.getAttachmentIdsForCases({
      caseIds: ids,
      unsecuredSavedObjectsClient,
    });

    const userActionIds = await userActionService.getUserActionIdsForCases(ids);

    const bulkDeleteEntities: SavedObjectsBulkDeleteObject[] = [
      ...ids.map((id) => ({ id, type: CASE_SAVED_OBJECT })),
      ...attachmentIds.map((id) => ({ id, type: CASE_COMMENT_SAVED_OBJECT })),
      ...userActionIds.map((id) => ({ id, type: CASE_USER_ACTION_SAVED_OBJECT })),
    ];

    await caseService.bulkDeleteCaseEntities({
      entities: bulkDeleteEntities,
      options: { refresh: 'wait_for' },
    });

    await userActionService.bulkAuditLogCaseDeletion(
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
