/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsFindResponse } from 'kibana/server';
import {
  CaseUserActionsResponse,
  CaseUserActionsResponseRt,
  CaseUserActionResponse,
} from '../../../common/api';
import { createCaseError } from '../../common/error';
import { CasesClientArgs } from '..';
import { Operations } from '../../authorization';
import { UserActionGet } from './client';

export const get = async (
  { caseId }: UserActionGet,
  clientArgs: CasesClientArgs
): Promise<CaseUserActionsResponse> => {
  const { unsecuredSavedObjectsClient, userActionService, logger, authorization } = clientArgs;

  try {
    const userActions = await userActionService.getAll({
      unsecuredSavedObjectsClient,
      caseId,
    });

    await authorization.ensureAuthorized({
      entities: userActions.saved_objects.map((userAction) => ({
        owner: userAction.attributes.owner,
        id: userAction.id,
      })),
      operation: Operations.getUserActions,
    });

    const resultsToEncode = extractAttributes(userActions);

    return CaseUserActionsResponseRt.encode(resultsToEncode);
  } catch (error) {
    throw createCaseError({
      message: `Failed to retrieve user actions case id: ${caseId}: ${error}`,
      error,
      logger,
    });
  }
};

function extractAttributes(
  userActions: SavedObjectsFindResponse<CaseUserActionResponse>
): CaseUserActionsResponse {
  return userActions.saved_objects.map((so) => so.attributes);
}
