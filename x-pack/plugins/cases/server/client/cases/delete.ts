/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import { Boom } from '@hapi/boom';
import { SavedObjectsFindResponse } from 'kibana/server';
import { CommentAttributes } from '../../../common/api';
import { MAX_CONCURRENT_SEARCHES } from '../../../common/constants';
import { CasesClientArgs } from '..';
import { createCaseError } from '../../common/error';
import { Operations, OwnerEntity } from '../../authorization';

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

    const deleteCasesMapper = async (id: string) =>
      caseService.deleteCase({
        id,
      });

    // Ensuring we don't too many concurrent deletions running.
    await pMap(ids, deleteCasesMapper, {
      concurrency: MAX_CONCURRENT_SEARCHES,
    });

    const getCommentsMapper = async (id: string) =>
      caseService.getAllCaseComments({
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

    await userActionService.bulkCreateCaseDeletion({
      unsecuredSavedObjectsClient,
      cases: cases.saved_objects.map((caseInfo) => ({
        id: caseInfo.id,
        owner: caseInfo.attributes.owner,
        connectorId: caseInfo.attributes.connector.id,
      })),
      user,
    });
  } catch (error) {
    throw createCaseError({
      message: `Failed to delete cases ids: ${JSON.stringify(ids)}: ${error}`,
      error,
      logger,
    });
  }
}
