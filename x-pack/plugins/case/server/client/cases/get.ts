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
}

export const get = async ({
  savedObjectsClient,
  caseService,
  id,
  includeComments = false,
}: GetParams): Promise<CaseResponse> => {
  const theCase = await caseService.getCase({
    client: savedObjectsClient,
    id,
  });

  if (!includeComments) {
    return CaseResponseRt.encode(
      flattenCaseSavedObject({
        savedObject: theCase,
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
  });

  return CaseResponseRt.encode(
    flattenCaseSavedObject({
      savedObject: theCase,
      comments: theComments.saved_objects,
      totalComment: theComments.total,
      totalAlerts: countAlertsForID({ comments: theComments, id }),
    })
  );
};
