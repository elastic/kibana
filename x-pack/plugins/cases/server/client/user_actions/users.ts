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
    const usersResponse: User[] = [];

    // ensure that we have authorization for reading the case
    const theCase = await casesClient.cases.resolve({ id: caseId, includeComments: false });

    const { participants, users } = await userActionService.getUsers({
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

    /**
     * To avoid duplicates, a user that is already participant
     * should be removed from the assignees returned by the case.
     */

    const assigneesUids = theCase.case.assignees
      .map((assignee) => assignee.uid)
      .filter((uid) => !participantsUids.includes(uid));

    const userProfileUids = new Set([...users, ...participantsUids, ...assigneesUids]);
    const userProfiles = await getUserProfiles(securityStartPlugin, userProfileUids);

    for (const participant of participants) {
      const user = getUserInformation(userProfiles, participant.user.profile_uid, participant.user);

      usersResponse.push({
        user,
        type: 'participant',
      });

      /**
       * To avoid duplicates, a user that is
       * a participant should not be also added
       * as a user. For that reason, we remove
       * its profile_uid from the usersUids Set
       */
      if (participant.user.profile_uid) {
        users.delete(participant.user.profile_uid);
      }
    }

    for (const uid of assigneesUids) {
      usersResponse.push({
        user: getUserInformation(userProfiles, uid),
        type: 'participant',
      });

      /**
       * To avoid duplicates, a user that is
       * an assignee and thus a participant should not be also added
       * as a user. For that reason, we remove
       * its uid from the usersUids Set
       */
      users.delete(uid);
    }

    for (const uid of users.values()) {
      usersResponse.push({
        user: getUserInformation(userProfiles, uid),
        type: 'user',
      });
    }

    const results = { users: usersResponse };

    return GetCaseUsersResponseRt.encode(results);
  } catch (error) {
    throw createCaseError({
      message: `Failed to retrieve the case users case id: ${caseId}: ${error}`,
      error,
      logger,
    });
  }
};

const getUserInformation = (
  userProfiles: Map<string, UserProfile>,
  uid: string | undefined,
  userInfo?: User['user']
): User['user'] => {
  const userProfile = uid != null ? userProfiles.get(uid) : undefined;

  return {
    email: userProfile?.user.email ?? userInfo?.email,
    full_name: userProfile?.user.full_name ?? userInfo?.full_name,
    username: userProfile?.user.username ?? userInfo?.username,
    profile_uid: userProfile?.uid ?? uid ?? userInfo?.profile_uid,
  };
};
