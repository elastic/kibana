/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserProfile } from '@kbn/user-profile-components';
import type { AuthenticatedElasticUser } from '../../common/lib/kibana';
import type { User } from '../../../common/api';
import type { FilterMode as RecentCasesFilterMode } from './types';

export interface ReporterFilter {
  currentUserProfile?: UserProfile;
  currentUser: Partial<AuthenticatedElasticUser> | null;
  isLoadingCurrentUserProfile: boolean;
  recentCasesFilterBy: RecentCasesFilterMode;
}

export interface AssigneeFilter {
  currentUserProfile?: UserProfile;
  isLoadingCurrentUserProfile: boolean;
}

export const getReporterFilter = ({
  currentUserProfile,
  currentUser,
  isLoadingCurrentUserProfile,
  recentCasesFilterBy,
}: ReporterFilter): { reporters: User[] } => {
  const emptyReportersFilter = { reporters: [] };

  if (recentCasesFilterBy !== 'myRecentlyReported') {
    return emptyReportersFilter;
  }

  if (currentUserProfile != null && !isLoadingCurrentUserProfile) {
    return {
      reporters: [
        {
          email: currentUserProfile.user.email,
          full_name: currentUserProfile.user.full_name,
          username: currentUserProfile.user.username,
          profile_uid: currentUserProfile.uid,
        },
      ],
    };
  } else if (currentUser != null) {
    return {
      reporters: [
        {
          email: currentUser.email,
          full_name: currentUser.fullName,
          username: currentUser.username,
        },
      ],
    };
  }

  return emptyReportersFilter;
};

export const getAssigneeFilter = ({
  currentUserProfile,
  isLoadingCurrentUserProfile,
}: AssigneeFilter): { assignees: string[] } => {
  const emptyAssigneesFilter = { assignees: [] };

  if (currentUserProfile != null && !isLoadingCurrentUserProfile) {
    return {
      assignees: [currentUserProfile.uid],
    };
  }

  return emptyAssigneesFilter;
};
