/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { sortBy } from 'lodash';
import { useMemo } from 'react';
import { CaseAssignees } from '../../../common/api';
import { CurrentUserProfile } from '../../components/types';
import { getSortField, moveCurrentUserToBeginning } from '../../components/user_profiles/sort';
import { Assignee, AssigneeWithProfile } from '../../components/user_profiles/types';

export const useAssignees = ({
  caseAssignees,
  userProfiles,
  currentUserProfile,
}: {
  caseAssignees: CaseAssignees;
  userProfiles: Map<string, UserProfileWithAvatar>;
  currentUserProfile: CurrentUserProfile;
}) => {
  const currentUserAsAssignee = getCurrentUserProfileAsAssignee(currentUserProfile);

  const assigneesWithProfiles = useMemo(() => {
    const sortedUserProfiles = sortProfiles(
      caseAssignees.reduce<AssigneeWithProfile[]>((acc, assignee) => {
        const profile = userProfiles.get(assignee.uid);

        if (profile) {
          acc.push({ uid: assignee.uid, profile });
        }

        return acc;
      }, [])
    );

    const result = moveCurrentUserToBeginning<AssigneeWithProfile>(
      currentUserAsAssignee,
      sortedUserProfiles
    );

    return result ?? [];
  }, [caseAssignees, currentUserAsAssignee, userProfiles]);

  const assigneesWithoutProfiles = useMemo(
    () =>
      caseAssignees.reduce<Assignee[]>((acc, assignee) => {
        const profile = userProfiles.get(assignee.uid);

        if (!profile) {
          acc.push({ uid: assignee.uid });
        }

        return acc;
      }, []),
    [caseAssignees, userProfiles]
  );

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

const getCurrentUserProfileAsAssignee = (currentUserProfile: CurrentUserProfile) =>
  currentUserProfile != null
    ? { uid: currentUserProfile.uid, profile: currentUserProfile }
    : undefined;

const sortProfiles = (assignees: AssigneeWithProfile[]) => {
  return sortBy(assignees, (assignee) => getSortField(assignee.profile));
};
