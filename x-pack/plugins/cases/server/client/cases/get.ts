/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract, Logger, SavedObject } from 'kibana/server';
import { flattenCaseSavedObject } from '../../routes/api/utils';
import { CaseResponseRt, CaseResponse, ESCaseAttributes } from '../../../common';
import { CaseServiceSetup } from '../../services';
import { countAlertsForID } from '../../common';
import { createCaseError } from '../../common/error';
import { ENABLE_CASE_CONNECTOR } from '../../../common/constants';

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
    let theCase: SavedObject<ESCaseAttributes>;
    let subCaseIds: string[] = [];

    if (ENABLE_CASE_CONNECTOR) {
      const [caseInfo, subCasesForCaseId] = await Promise.all([
        caseService.getCase({
          client: savedObjectsClient,
          id,
        }),
        caseService.findSubCasesByCaseId({ client: savedObjectsClient, ids: [id] }),
      ]);

      theCase = caseInfo;
      subCaseIds = subCasesForCaseId.saved_objects.map((so) => so.id);
    } else {
      theCase = await caseService.getCase({
        client: savedObjectsClient,
        id,
      });
    }

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
      includeSubCaseComments: ENABLE_CASE_CONNECTOR && includeSubCaseComments,
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
