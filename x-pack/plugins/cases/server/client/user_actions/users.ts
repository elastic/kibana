/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserProfile } from '@kbn/security-plugin/common';
import type { GetCaseUsersResponse } from '../../../common/api';
import { GetCaseUsersResponseRt } from '../../../common/api';
import type { OwnerEntity } from '../../authorization';
import { Operations } from '../../authorization';
import { createCaseError } from '../../common/error';
import type { CasesClient } from '../client';
import type { CasesClientArgs } from '../types';
import type { GetUsersRequest } from './types';
import { getUserProfiles } from '../cases/utils';

type User = GetCaseUsersResponse['users'][number];

export const getUsers = async (
  { caseId }: GetUsersRequest,
  casesClient: CasesClient,
  clientArgs: CasesClientArgs
): Promise<GetCaseUsersResponse> => {
  const {
    services: { userActionService },
    logger,
    authorization,
    securityStartPlugin,
  } = clientArgs;

  try {
    const users: User[] = [];

    // ensure that we have authorization for reading the case
    await casesClient.cases.resolve({ id: caseId, includeComments: false });

    const { participants, assignees } = await userActionService.getUsers({
      caseId,
    });

    const entities: OwnerEntity[] = participants.map((participant) => ({
      id: participant.id,
      owner: participant.owner,
    }));

    await authorization.ensureAuthorized({
      entities,
      operation: Operations.getUserActionUsers,
    });

    const participantsUids = participants
      .filter((participant) => participant.user.profile_uid != null)
      .map((participant) => participant.user.profile_uid) as string[];

    const userProfileUids = new Set([...assignees, ...participantsUids]);
    const userProfiles = await getUserProfiles(securityStartPlugin, userProfileUids);

    for (const participant of participants) {
      const user =
        participant.user.profile_uid != null
          ? getUserInformation(userProfiles, participant.user.profile_uid)
          : {
              email: participant.user.email,
              full_name: participant.user.full_name,
              username: participant.user.username,
            };

      users.push({
        user,
        type: 'participant',
      });

      /**
       * To avoid duplicates, a user that is
       * a participant should not be also added
       * as a user. For that reason, we remove
       * its profile_uid from the assignees Set
       */
      if (participant.user.profile_uid) {
        assignees.delete(participant.user.profile_uid);
      }
    }

    for (const uid of assignees.values()) {
      users.push({
        user: getUserInformation(userProfiles, uid),
        type: 'user',
      });
    }

    const results = { users };

    return GetCaseUsersResponseRt.encode(results);
  } catch (error) {
    throw createCaseError({
      message: `Failed to retrieve the case users case id: ${caseId}: ${error}`,
      error,
      logger,
    });
  }
};

const getUserInformation = (userProfiles: Map<string, UserProfile>, uid: string): User['user'] => {
  const userProfile = userProfiles.get(uid);

  return {
    email: userProfile?.user.email,
    full_name: userProfile?.user.full_name,
    username: userProfile?.user.username,
    profile_uid: userProfile?.uid ?? uid,
  };
};
