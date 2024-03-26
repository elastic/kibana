/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isString } from 'lodash';
import type { UserProfileAvatarData, UserProfileWithAvatar } from '@kbn/user-profile-components';
import type { GetCaseUsersResponse } from '../../../common/types/api';
import { GetCaseUsersResponseRt } from '../../../common/types/api';
import { decodeOrThrow } from '../../common/runtime_types';
import type { OwnerEntity } from '../../authorization';
import { Operations } from '../../authorization';
import { createCaseError } from '../../common/error';
import type { CasesClient } from '../client';
import type { CasesClientArgs } from '../types';
import type { GetUsersRequest } from './types';
import { getUserProfiles } from '../cases/utils';
import type { User, UserWithProfileInfo } from '../../../common/types/domain';

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
    const reporter = theCase.case.created_by;
    const reporterProfileIdAsArray = reporter.profile_uid != null ? [reporter.profile_uid] : [];

    const userProfileUids = new Set([
      ...assignedAndUnassignedUsers,
      ...participantsUids,
      ...assigneesUids,
      ...reporterProfileIdAsArray,
    ]);

    const userProfiles = await getUserProfiles(securityStartPlugin, userProfileUids, 'avatar');

    const participantsResponse = convertUserInfoToResponse(
      userProfiles,
      participants.map((participant) => ({
        uid: participant.user.profile_uid,
        user: participant.user,
      }))
    );

    const assigneesResponse = convertUserInfoToResponse(userProfiles, theCase.case.assignees);
    const reporterResponse = convertUserInfoToResponse(userProfiles, [
      { uid: reporter.profile_uid, user: reporter },
    ]);

    /**
     * To avoid duplicates, a user that is
     * a participant or an assignee or a reporter should not be
     *  part of the assignedAndUnassignedUsers Set
     */
    const unassignedUsers = removeAllFromSet(assignedAndUnassignedUsers, [
      ...participantsUids,
      ...assigneesUids,
      ...reporterProfileIdAsArray,
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
      reporter: reporterResponse[0],
    };

    return decodeOrThrow(GetCaseUsersResponseRt)(results);
  } catch (error) {
    throw createCaseError({
      message: `Failed to retrieve the case users case id: ${caseId}: ${error}`,
      error,
      logger,
    });
  }
};

const convertUserInfoToResponse = (
  userProfiles: Map<string, UserProfileWithAvatar>,
  usersInfo: Array<{ uid: string | undefined; user?: User }>
): UserWithProfileInfo[] => {
  const response = [];

  for (const info of usersInfo) {
    response.push(getUserInformation(userProfiles, info.uid, info.user));
  }

  return response;
};

const getUserInformation = (
  userProfiles: Map<string, UserProfileWithAvatar>,
  uid: string | undefined,
  userInfo?: User
): UserWithProfileInfo => {
  const userProfile = uid != null ? userProfiles.get(uid) : undefined;

  return {
    user: {
      email: userProfile?.user.email ?? userInfo?.email ?? null,
      full_name: userProfile?.user.full_name ?? userInfo?.full_name ?? null,
      username: userProfile?.user.username ?? userInfo?.username ?? null,
    },
    avatar: getUserProfileAvatar(userProfile?.data.avatar),
    uid: userProfile?.uid ?? uid ?? userInfo?.profile_uid,
  };
};

const getUserProfileAvatar = (
  avatar?: UserProfileAvatarData | undefined
): UserWithProfileInfo['avatar'] | undefined => {
  if (!avatar) {
    return avatar;
  }

  const res = {
    ...(isString(avatar.initials) ? { initials: avatar.initials } : {}),
    ...(isString(avatar.color) ? { color: avatar.color } : {}),
    ...(isString(avatar.imageUrl) ? { imageUrl: avatar.imageUrl } : {}),
  };

  return res;
};

const removeAllFromSet = (originalSet: Set<string>, values: string[]) => {
  const newSet = new Set(originalSet);
  values.forEach((value) => newSet.delete(value));

  return newSet;
};
