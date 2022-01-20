/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import { Boom } from '@hapi/boom';
import { SavedObject, SavedObjectsClientContract, SavedObjectsFindResponse } from 'kibana/server';
import { CommentAttributes, SubCaseAttributes, OWNER_FIELD } from '../../../common/api';
import { ENABLE_CASE_CONNECTOR, MAX_CONCURRENT_SEARCHES } from '../../../common/constants';
import { CasesClientArgs } from '..';
import { createCaseError } from '../../common/error';
import { AttachmentService, CasesService } from '../../services';
import { buildCaseUserActionItem } from '../../services/user_actions/helpers';
import { Operations, OwnerEntity } from '../../authorization';

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

  const commentMapper = (commentSO: SavedObject<CommentAttributes>) =>
    attachmentService.delete({ unsecuredSavedObjectsClient, attachmentId: commentSO.id });

  const subCasesMapper = (subCaseSO: SavedObject<SubCaseAttributes>) =>
    caseService.deleteSubCase(unsecuredSavedObjectsClient, subCaseSO.id);

  /**
   * This shouldn't actually delete anything because
   * all the comments should be deleted when comments are deleted
   * per case ID. We also ensure that we don't too many concurrent deletions running.
   */
  await pMap(commentsForSubCases.saved_objects, commentMapper, {
    concurrency: MAX_CONCURRENT_SEARCHES,
  });

  await pMap(subCasesForCaseIds.saved_objects, subCasesMapper, {
    concurrency: MAX_CONCURRENT_SEARCHES,
  });
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

    const deleteCasesMapper = async (id: string) =>
      caseService.deleteCase({
        unsecuredSavedObjectsClient,
        id,
      });

    // Ensuring we don't too many concurrent deletions running.
    await pMap(ids, deleteCasesMapper, {
      concurrency: MAX_CONCURRENT_SEARCHES,
    });

    const getCommentsMapper = async (id: string) =>
      caseService.getAllCaseComments({
        unsecuredSavedObjectsClient,
        id,
      });

    // Ensuring we don't too many concurrent get running.
    const comments = await pMap(ids, getCommentsMapper, {
      concurrency: MAX_CONCURRENT_SEARCHES,
    });

    /**
     * This is a nested pMap.Mapper.
     * Each element of the comments array contains all comments of a particular case.
     * For that reason we need first to create a map that iterate over all cases
     * and return a pMap that deletes the comments for that case
     */
    const deleteCommentsMapper = async (commentRes: SavedObjectsFindResponse<CommentAttributes>) =>
      pMap(commentRes.saved_objects, (comment) =>
        attachmentService.delete({
          unsecuredSavedObjectsClient,
          attachmentId: comment.id,
        })
      );

    // Ensuring we don't too many concurrent deletions running.
    await pMap(comments, deleteCommentsMapper, {
      concurrency: MAX_CONCURRENT_SEARCHES,
    });

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
            ...(ENABLE_CASE_CONNECTOR ? ['sub_case' as const] : []),
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
