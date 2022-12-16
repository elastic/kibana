/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserProfile } from '@kbn/user-profile-components';
import type { AuthenticatedElasticUser } from '../../common/lib/kibana';

export const getAssigneeFilter = ({
  currentUserProfile,
  currentUser,
  isLoadingCurrentUserProfile,
}: {
  currentUserProfile?: UserProfile;
  currentUser: AuthenticatedElasticUser | null;
  isLoadingCurrentUserProfile: boolean;
}): { assignees: string[] } => {
  const emptyFilter = { assignees: [] };

  if (currentUserProfile != null && !isLoadingCurrentUserProfile) {
    return {
      assignees: [currentUserProfile.uid],
    };
  }

  return emptyFilter;
};
