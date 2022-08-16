/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { UserAvatar, UserProfileWithAvatar } from '@kbn/user-profile-components';
import { CaseUnknownUserAvatar } from './unknown_user';

interface UserAvatarProps {
  profile?: UserProfileWithAvatar;
}

const CaseUserAvatarComponent: React.FC<UserAvatarProps> = ({ profile }) => {
  return profile !== undefined ? (
    <UserAvatar
      user={profile.user}
      avatar={profile.data.avatar}
      data-test-subj="case-user-profile-avatar"
      size="s"
    />
  ) : (
    <CaseUnknownUserAvatar />
  );
};

CaseUserAvatarComponent.displayName = 'CaseUserAvatar';

export const CaseUserAvatar = React.memo(CaseUserAvatarComponent);
