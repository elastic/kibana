/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Boom } from '@hapi/boom';
import { SavedObjectsClientContract } from 'kibana/server';
import { ENABLE_CASE_CONNECTOR } from '../../../common/constants';
import { CasesClientArgs } from '..';
import { createCaseError } from '../../common/error';
import { AttachmentService, CasesService } from '../../services';
import { buildCaseUserActionItem } from '../../services/user_actions/helpers';
import { Operations, OwnerEntity } from '../../authorization';
import { OWNER_FIELD } from '../../../common/api';

async function deleteSubCases({
  attachmentService,
  caseService,
  unsecuredSavedObjectsClient,
  caseIds,
}: {
  attachmentService: AttachmentService;
  caseService: CasesService;
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  caseIds: string[];
}) {
  const subCasesForCaseIds = await caseService.findSubCasesByCaseId({
    unsecuredSavedObjectsClient,
    ids: caseIds,
  });

  const subCaseIDs = subCasesForCaseIds.saved_objects.map((subCase) => subCase.id);
  const commentsForSubCases = await caseService.getAllSubCaseComments({
    unsecuredSavedObjectsClient,
    id: subCaseIDs,
  });

  // This shouldn't actually delete anything because all the comments should be deleted when comments are deleted
  // per case ID
  await Promise.all(
    commentsForSubCases.saved_objects.map((commentSO) =>
      attachmentService.delete({ unsecuredSavedObjectsClient, attachmentId: commentSO.id })
    )
  );

  await Promise.all(
    subCasesForCaseIds.saved_objects.map((subCaseSO) =>
      caseService.deleteSubCase(unsecuredSavedObjectsClient, subCaseSO.id)
    )
  );
}

/**
 * Deletes the specified cases and their attachments.
 *
 * @ignore
 */
export async function deleteCases(ids: string[], clientArgs: CasesClientArgs): Promise<void> {
  const {
    unsecuredSavedObjectsClient,
    caseService,
    attachmentService,
    user,
    userActionService,
    logger,
    authorization,
  } = clientArgs;
  try {
    const cases = await caseService.getCases({ unsecuredSavedObjectsClient, caseIds: ids });
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

    await Promise.all(
      ids.map((id) =>
        caseService.deleteCase({
          unsecuredSavedObjectsClient,
          id,
        })
      )
    );

    const comments = await Promise.all(
      ids.map((id) =>
        caseService.getAllCaseComments({
          unsecuredSavedObjectsClient,
          id,
        })
      )
    );

    if (comments.some((c) => c.saved_objects.length > 0)) {
      await Promise.all(
        comments.map((c) =>
          Promise.all(
            c.saved_objects.map(({ id }) =>
              attachmentService.delete({
                unsecuredSavedObjectsClient,
                attachmentId: id,
              })
            )
          )
        )
      );
    }

    if (ENABLE_CASE_CONNECTOR) {
      await deleteSubCases({
        attachmentService,
        caseService,
        unsecuredSavedObjectsClient,
        caseIds: ids,
      });
    }

    const deleteDate = new Date().toISOString();

    await userActionService.bulkCreate({
      unsecuredSavedObjectsClient,
      actions: cases.saved_objects.map((caseInfo) =>
        buildCaseUserActionItem({
          action: 'delete',
          actionAt: deleteDate,
          actionBy: user,
          caseId: caseInfo.id,
          fields: [
            'description',
            'status',
            'tags',
            'title',
            'connector',
            'settings',
            OWNER_FIELD,
            'comment',
            ...(ENABLE_CASE_CONNECTOR ? ['sub_case'] : []),
          ],
          owner: caseInfo.attributes.owner,
        })
      ),
    });
  } catch (error) {
    throw createCaseError({
      message: `Failed to delete cases ids: ${JSON.stringify(ids)}: ${error}`,
      error,
      logger,
    });
  }
}
