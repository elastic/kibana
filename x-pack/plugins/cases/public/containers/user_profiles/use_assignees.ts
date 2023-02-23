/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { useMemo } from 'react';
import type { CaseAssignees } from '../../../common/api';
import { sortProfiles } from '../../components/user_profiles/sort';
import type { Assignee, AssigneeWithProfile } from '../../components/user_profiles/types';

interface PartitionedAssignees {
  usersWithProfiles: UserProfileWithAvatar[];
  usersWithoutProfiles: Assignee[];
}

export const useAssignees = ({
  caseAssignees,
  userProfiles,
}: {
  caseAssignees: CaseAssignees;
  userProfiles: Map<string, UserProfileWithAvatar>;
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

    const orderedProf = sortProfiles(usersWithProfiles);

    const withProfiles = orderedProf?.map((profile) => ({ uid: profile.uid, profile }));
    return {
      assigneesWithProfiles: withProfiles ?? [],
      assigneesWithoutProfiles: usersWithoutProfiles,
    };
  }, [caseAssignees, userProfiles]);

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
