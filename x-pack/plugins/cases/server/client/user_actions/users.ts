/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserProfile } from '@kbn/security-plugin/common';
import type { GetCaseUsersResponse, User } from '../../../common/api';
import { GetCaseUsersResponseRt } from '../../../common/api';
import type { OwnerEntity } from '../../authorization';
import { Operations } from '../../authorization';
import { createCaseError } from '../../common/error';
import type { CasesClient } from '../client';
import type { CasesClientArgs } from '../types';
import type { GetUsersRequest } from './types';
import { getUserProfiles } from '../cases/utils';

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
    // ensure that we have authorization for reading the case
    const theCase = await casesClient.cases.resolve({ id: caseId, includeComments: false });

    const { participants, assignedAndUnassignedUsers } = await userActionService.getUsers({
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

    const assigneesUids = theCase.case.assignees.map((assignee) => assignee.uid);

    const userProfileUids = new Set([
      ...assignedAndUnassignedUsers,
      ...participantsUids,
      ...assigneesUids,
    ]);

    const userProfiles = await getUserProfiles(securityStartPlugin, userProfileUids);

    const participantsResponse = convertUserInfoToResponse(
      userProfiles,
      participants.map((participant) => ({
        uid: participant.user.profile_uid,
        user: participant.user,
      }))
    );

    const assigneesResponse = convertUserInfoToResponse(userProfiles, theCase.case.assignees);

    /**
     * To avoid duplicates, a user that is
     * a participant or an assignee should not be
     *  part of the assignedAndUnassignedUsers Set
     */
    const unassignedUsers = removeAllFromSet(assignedAndUnassignedUsers, [
      ...participantsUids,
      ...assigneesUids,
    ]);

    const unassignedUsersResponse = convertUserInfoToResponse(
      userProfiles,
      [...unassignedUsers.values()].map((uid) => ({
        uid,
      }))
    );

    const results = {
      participants: participantsResponse,
      assignees: assigneesResponse,
      unassignedUsers: unassignedUsersResponse,
    };

    return GetCaseUsersResponseRt.encode(results);
  } catch (error) {
    throw createCaseError({
      message: `Failed to retrieve the case users case id: ${caseId}: ${error}`,
      error,
      logger,
    });
  }
};

const convertUserInfoToResponse = (
  userProfiles: Map<string, UserProfile>,
  usersInfo: Array<{ uid: string | undefined; user?: User }>
): User[] => {
  const response = [];

  for (const info of usersInfo) {
    response.push(getUserInformation(userProfiles, info.uid, info.user));
  }

  return response;
};

const getUserInformation = (
  userProfiles: Map<string, UserProfile>,
  uid: string | undefined,
  userInfo?: User
): User => {
  const userProfile = uid != null ? userProfiles.get(uid) : undefined;

  return {
    email: userProfile?.user.email ?? userInfo?.email,
    full_name: userProfile?.user.full_name ?? userInfo?.full_name,
    username: userProfile?.user.username ?? userInfo?.username,
    profile_uid: userProfile?.uid ?? uid ?? userInfo?.profile_uid,
  };
};

const removeAllFromSet = (originalSet: Set<string>, values: string[]) => {
  const newSet = new Set(originalSet);
  values.forEach((value) => newSet.delete(value));

  return newSet;
};
