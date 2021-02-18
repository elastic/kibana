/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract, Logger } from 'kibana/server';
import { flattenCaseSavedObject } from '../../routes/api/utils';
import { CaseResponseRt, CaseResponse } from '../../../common/api';
import { CaseServiceSetup } from '../../services';
import { countAlertsForID } from '../../common';
import { createCaseError } from '../../common/error';

interface GetParams {
  savedObjectsClient: SavedObjectsClientContract;
  caseService: CaseServiceSetup;
  id: string;
  includeComments?: boolean;
  includeSubCaseComments?: boolean;
  logger: Logger;
}

/**
 * Retrieves a case and optionally its comments and sub case comments.
 */
export const get = async ({
  savedObjectsClient,
  caseService,
  id,
  logger,
  includeComments = false,
  includeSubCaseComments = false,
}: GetParams): Promise<CaseResponse> => {
  try {
    const [theCase, subCasesForCaseId] = await Promise.all([
      caseService.getCase({
        client: savedObjectsClient,
        id,
      }),
      caseService.findSubCasesByCaseId({ client: savedObjectsClient, ids: [id] }),
    ]);

    const subCaseIds = subCasesForCaseId.saved_objects.map((so) => so.id);

    if (!includeComments) {
      return CaseResponseRt.encode(
        flattenCaseSavedObject({
          savedObject: theCase,
          subCaseIds,
        })
      );
    }
    const theComments = await caseService.getAllCaseComments({
      client: savedObjectsClient,
      id,
      options: {
        sortField: 'created_at',
        sortOrder: 'asc',
      },
      includeSubCaseComments,
    });

    return CaseResponseRt.encode(
      flattenCaseSavedObject({
        savedObject: theCase,
        comments: theComments.saved_objects,
        subCaseIds,
        totalComment: theComments.total,
        totalAlerts: countAlertsForID({ comments: theComments, id }),
      })
    );
  } catch (error) {
    throw createCaseError({ message: `Failed to get case id: ${id}: ${error}`, error, logger });
  }
};
