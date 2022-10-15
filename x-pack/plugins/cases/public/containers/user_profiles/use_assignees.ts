/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { useMemo } from 'react';
import type { CaseAssignees } from '../../../common/api';
import type { CurrentUserProfile } from '../../components/types';
import { bringCurrentUserToFrontAndSort } from '../../components/user_profiles/sort';
import type { Assignee, AssigneeWithProfile } from '../../components/user_profiles/types';

interface PartitionedAssignees {
  usersWithProfiles: UserProfileWithAvatar[];
  usersWithoutProfiles: Assignee[];
}

export const useAssignees = ({
  caseAssignees,
  userProfiles,
  currentUserProfile,
}: {
  caseAssignees: CaseAssignees;
  userProfiles: Map<string, UserProfileWithAvatar>;
  currentUserProfile: CurrentUserProfile;
}): {
  assigneesWithProfiles: AssigneeWithProfile[];
  assigneesWithoutProfiles: Assignee[];
  allAssignees: Assignee[];
} => {
  const { assigneesWithProfiles, assigneesWithoutProfiles } = useMemo(() => {
    const { usersWithProfiles, usersWithoutProfiles } = caseAssignees.reduce<PartitionedAssignees>(
      (acc, assignee) => {
        const profile = userProfiles.get(assignee.uid);

        if (profile) {
          acc.usersWithProfiles.push(profile);
        } else {
          acc.usersWithoutProfiles.push({ uid: assignee.uid });
        }

        return acc;
      },
      { usersWithProfiles: [], usersWithoutProfiles: [] }
    );

    const orderedProf = bringCurrentUserToFrontAndSort(currentUserProfile, usersWithProfiles);

    const assigneesWithProfile2 = orderedProf?.map((profile) => ({ uid: profile.uid, profile }));
    return {
      assigneesWithProfiles: assigneesWithProfile2 ?? [],
      assigneesWithoutProfiles: usersWithoutProfiles,
    };
  }, [caseAssignees, currentUserProfile, userProfiles]);

  const allAssignees = useMemo(
    () => [...assigneesWithProfiles, ...assigneesWithoutProfiles],
    [assigneesWithProfiles, assigneesWithoutProfiles]
  );

  return {
    assigneesWithProfiles,
    assigneesWithoutProfiles,
    allAssignees,
  };
};
