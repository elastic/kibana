/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flattenCaseSavedObject } from '../../routes/api/utils';
import { CaseResponseRt, CaseResponse } from '../../../common/api';
import { CaseClientGet, CaseClientFactoryArguments } from '../types';

export const get = ({ savedObjectsClient, caseService }: CaseClientFactoryArguments) => async ({
  id,
  includeComments = false,
}: CaseClientGet): Promise<CaseResponse> => {
  const theCase = await caseService.getCase({
    client: savedObjectsClient,
    caseId: id,
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
    caseId: id,
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
    })
  );
};
