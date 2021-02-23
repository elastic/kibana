/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from 'kibana/server';
import { flattenCaseSavedObject } from '../../routes/api/utils';
import { CaseResponseRt, CaseResponse } from '../../../common/api';
import { CaseServiceSetup } from '../../services';
import { countAlertsForID } from '../../common';

interface GetParams {
  savedObjectsClient: SavedObjectsClientContract;
  caseService: CaseServiceSetup;
  id: string;
  includeComments?: boolean;
  includeSubCaseComments?: boolean;
}

export const get = async ({
  savedObjectsClient,
  caseService,
  id,
  includeComments = false,
  includeSubCaseComments = false,
}: GetParams): Promise<CaseResponse> => {
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
};
