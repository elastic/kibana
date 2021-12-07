/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectReference, SavedObjectsFindResponse } from 'kibana/server';
import {
  CaseUserActionsResponse,
  CaseUserActionsResponseRt,
  CaseUserActionResponse,
} from '../../../common/api';
import { SUB_CASE_SAVED_OBJECT } from '../../../common/constants';
import { createCaseError } from '../../common/error';
import { checkEnabledCaseConnectorOrThrow } from '../../common/utils';
import { SUB_CASE_REF_NAME } from '../../common/constants';
import { CasesClientArgs } from '..';
import { Operations } from '../../authorization';
import { UserActionGet } from './client';

export const get = async (
  { caseId, subCaseId }: UserActionGet,
  clientArgs: CasesClientArgs
): Promise<CaseUserActionsResponse> => {
  const { unsecuredSavedObjectsClient, userActionService, logger, authorization } = clientArgs;

  try {
    checkEnabledCaseConnectorOrThrow(subCaseId);

    const userActions = await userActionService.getAll({
      unsecuredSavedObjectsClient,
      caseId,
      subCaseId,
    });

    await authorization.ensureAuthorized({
      entities: userActions.saved_objects.map((userAction) => ({
        owner: userAction.attributes.owner,
        id: userAction.id,
      })),
      operation: Operations.getUserActions,
    });

    const resultsToEncode =
      subCaseId == null
        ? extractAttributesWithoutSubCases(userActions)
        : extractAttributes(userActions);

    return CaseUserActionsResponseRt.encode(resultsToEncode);
  } catch (error) {
    throw createCaseError({
      message: `Failed to retrieve user actions case id: ${caseId} sub case id: ${subCaseId}: ${error}`,
      error,
      logger,
    });
  }
};

export function extractAttributesWithoutSubCases(
  userActions: SavedObjectsFindResponse<CaseUserActionResponse>
): CaseUserActionsResponse {
  // exclude user actions relating to sub cases from the results
  const hasSubCaseReference = (references: SavedObjectReference[]) =>
    references.find((ref) => ref.type === SUB_CASE_SAVED_OBJECT && ref.name === SUB_CASE_REF_NAME);

  return userActions.saved_objects
    .filter((so) => !hasSubCaseReference(so.references))
    .map((so) => so.attributes);
}

function extractAttributes(
  userActions: SavedObjectsFindResponse<CaseUserActionResponse>
): CaseUserActionsResponse {
  return userActions.saved_objects.map((so) => so.attributes);
}
