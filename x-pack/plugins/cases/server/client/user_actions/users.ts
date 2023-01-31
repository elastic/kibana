/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { UserProfile } from '@kbn/security-plugin/common';
import type { GetCaseUsersResponse } from '../../../common/api';
import { GetCaseUsersResponseRt } from '../../../common/api';
import type { OwnerEntity } from '../../authorization';
import { Operations } from '../../authorization';
import { createCaseError } from '../../common/error';
import type { CasesClient } from '../client';
import type { CasesClientArgs } from '../types';
import type { GetUsersRequest } from './types';
import type { GetUsersResponse as UserActionsServiceGetUsersResponse } from '../../services/user_actions';

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
    const { participants: participantsInfo, userProfileUids } = await userActionService.getUsers({
      caseId,
    });

    const entities: OwnerEntity[] = participantsInfo.map((participant) => ({
      id: participant.id,
      owner: participant.owner,
    }));

    await authorization.ensureAuthorized({
      entities,
      operation: Operations.getUserActionUsers,
    });

    const userProfiles = await getProfiles(securityStartPlugin, userProfileUids);

    for (const participant of participantsInfo) {
      users.push({
        user: { ...getUserInformation(userProfiles, participant.user) },
        type: 'participant',
      });

      if (participant.user.profile_uid) {
        userProfileUids.delete(participant.user.profile_uid);
      }
    }

    for (const uid of userProfileUids) {
      const userProfile = userProfiles.get(uid);
      if (userProfile) {
        users.push({
          user: {
            email: userProfile.user.email,
            full_name: userProfile.user.full_name,
            username: userProfile.user.username,
            profile_uid: userProfile.uid,
          },
          type: 'assignee',
        });
      }
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

const getProfiles = async (
  securityStartPlugin: SecurityPluginStart,
  uids: Set<string>
): Promise<Map<string, UserProfile>> => {
  if (uids.size <= 0) {
    return new Map();
  }

  const userProfiles =
    (await securityStartPlugin.userProfiles.bulkGet({
      uids,
    })) ?? [];

  return userProfiles.reduce<Map<string, UserProfile>>((acc, profile) => {
    acc.set(profile.uid, profile);
    return acc;
  }, new Map());
};

const getUserInformation = (
  userProfiles: Map<string, UserProfile>,
  participant: UserActionsServiceGetUsersResponse['participants'][0]['user'] | undefined
): User['user'] => {
  const profileUid = participant?.profile_uid;
  const userProfile =
    profileUid != null ? userProfiles.get(profileUid) : { uid: profileUid, user: participant };

  return {
    email: userProfile?.user?.email,
    full_name: userProfile?.user?.full_name,
    username: userProfile?.user?.username,
    profile_uid: userProfile?.uid,
  };
};
