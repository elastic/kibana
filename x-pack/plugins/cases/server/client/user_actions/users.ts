/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetCaseUsersResponse } from '../../../common/api';
import { GetCaseUsersResponseRt } from '../../../common/api';
import type { OwnerEntity } from '../../authorization';
import { Operations } from '../../authorization';
import { createCaseError } from '../../common/error';
import type { CasesClient } from '../client';
import type { CasesClientArgs } from '../types';
import type { GetUsersRequest } from './types';

export const getUsers = async (
  { caseId }: GetUsersRequest,
  casesClient: CasesClient,
  clientArgs: CasesClientArgs
): Promise<GetCaseUsersResponse> => {
  const {
    services: { userActionService },
    logger,
    authorization,
  } = clientArgs;

  try {
    const entities: OwnerEntity[] = [];
    const participants: GetCaseUsersResponse['participants'] = [];

    // ensure that we have authorization for reading the case
    await casesClient.cases.resolve({ id: caseId, includeComments: false });
    const { participants: participantsInfo, users } = await userActionService.getUsers({ caseId });

    for (const participant of participantsInfo) {
      entities.push({ id: participant.id, owner: participant.owner });
      participants.push({ ...participant.created_by });
    }

    await authorization.ensureAuthorized({
      entities,
      operation: Operations.getUserActionUsers,
    });

    const results = { participants, users: Array.from(users.values()) };

    return GetCaseUsersResponseRt.encode(results);
  } catch (error) {
    throw createCaseError({
      message: `Failed to retrieve the case users case id: ${caseId}: ${error}`,
      error,
      logger,
    });
  }
};
