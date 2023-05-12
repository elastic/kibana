/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CaseUsers } from '../../../../../common/ui/types';
import { useGetCaseUsers } from '../../../../containers/use_get_case_users';
import { useCaseViewParams } from '../../../../common/navigation';

interface UserOptions {
  label: string;
  email: string;
  username: string;
}

interface GetUsers {
  userList: UserOptions[];
}

export const useGetUsers = (): GetUsers => {
  const { detailName: caseId } = useCaseViewParams();
  const { data: caseUsers, isLoading: isLoadingCaseUsers } = useGetCaseUsers(caseId);

  const buildUserProfilesMap = (users?: CaseUsers): UserOptions[] => {
    const userProfiles: UserOptions[] = [];

    if (!users || isLoadingCaseUsers) {
      return [];
    }

    for (const user of [...users.assignees, ...users.participants, users.reporter]) {
      if (user.uid != null && user.user.username != null) {
        if (
          (userProfiles.length &&
            !userProfiles.find((profile) => profile.username === user.user.username)) ||
          !userProfiles.length
        ) {
          userProfiles.push({
            username: user.user.username,
            label: user.user.full_name ?? user.user.username,
            email: user.user.email ?? '',
          });
        }
      }
    }

    return userProfiles;
  };

  const userProfiles = buildUserProfilesMap(caseUsers);

  return { userList: userProfiles };
};
