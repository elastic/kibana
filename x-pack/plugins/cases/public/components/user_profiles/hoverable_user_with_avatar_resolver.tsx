/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import React from 'react';
import type { ElasticUser } from '../../containers/types';
import type { HoverableUserWithAvatarProps } from './hoverable_user_with_avatar';
import { HoverableUserWithAvatar } from './hoverable_user_with_avatar';
import { convertToUserInfo } from './user_converter';

const HoverableUserWithAvatarResolverComponent: React.FC<
  {
    user: ElasticUser;
    userProfiles?: Map<string, UserProfileWithAvatar>;
  } & Pick<HoverableUserWithAvatarProps, 'boldName'>
> = ({ user, userProfiles, boldName = true }) => {
  const { userInfo } = convertToUserInfo(user, userProfiles) ?? { userInfo: undefined };

  return <HoverableUserWithAvatar userInfo={userInfo} boldName={boldName} />;
};

HoverableUserWithAvatarResolverComponent.displayName = 'HoverableUserResolver';

export const HoverableUserWithAvatarResolver = React.memo(HoverableUserWithAvatarResolverComponent);
