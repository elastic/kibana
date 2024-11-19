/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CaseUserActionsDeprecatedResponse } from '../../../common/types/api';
import { CaseUserActionsDeprecatedResponseRt } from '../../../common/types/api';
import { createCaseError } from '../../common/error';
import type { CasesClientArgs } from '..';
import { Operations } from '../../authorization';
import type { UserActionGet } from './types';
import { extractAttributes } from './utils';
import { decodeOrThrow } from '../../common/runtime_types';

export const get = async (
  { caseId }: UserActionGet,
  clientArgs: CasesClientArgs
): Promise<CaseUserActionsDeprecatedResponse> => {
  const {
    services: { userActionService },
    logger,
    authorization,
  } = clientArgs;

  try {
    const userActions = await userActionService.getAll(caseId);

    await authorization.ensureAuthorized({
      entities: userActions.saved_objects.map((userAction) => ({
        owner: userAction.attributes.owner,
        id: userAction.id,
      })),
      operation: Operations.getUserActions,
    });

    const res = extractAttributes(userActions);

    return decodeOrThrow(CaseUserActionsDeprecatedResponseRt)(res);
  } catch (error) {
    throw createCaseError({
      message: `Failed to retrieve user actions case id: ${caseId}: ${error}`,
      error,
      logger,
    });
  }
};
