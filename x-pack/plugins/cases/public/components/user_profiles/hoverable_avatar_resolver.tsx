/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import React from 'react';
import type { ElasticUser } from '../../containers/types';
import { convertToUserInfo } from './user_converter';
import { HoverableAvatar } from './hoverable_avatar';

const HoverableAvatarResolverComponent: React.FC<{
  user: ElasticUser;
  userProfiles?: Map<string, UserProfileWithAvatar>;
}> = ({ user, userProfiles }) => {
  const { userInfo } = convertToUserInfo(user, userProfiles) ?? { userInfo: undefined };

  return <HoverableAvatar userInfo={userInfo} />;
};

HoverableAvatarResolverComponent.displayName = 'HoverableUserResolver';

export const HoverableAvatarResolver = React.memo(HoverableAvatarResolverComponent);
