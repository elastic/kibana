/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiAvatarProps } from '@elastic/eui';
import { EuiAvatar, useEuiTheme } from '@elastic/eui';
import type { FunctionComponent, HTMLAttributes } from 'react';
import React from 'react';

import type { UserAvatarData, UserInfo } from '../../common';
import {
  getUserAvatarColor,
  getUserAvatarInitials,
  getUserDisplayName,
  USER_AVATAR_MAX_INITIALS,
} from '../../common/model';

export interface UserAvatarProps extends Omit<HTMLAttributes<HTMLDivElement>, 'color'> {
  user?: Pick<UserInfo, 'username' | 'full_name'>;
  avatar?: UserAvatarData;
  size?: EuiAvatarProps['size'];
  isDisabled?: EuiAvatarProps['isDisabled'];
}

export const UserAvatar: FunctionComponent<UserAvatarProps> = ({ user, avatar, ...rest }) => {
  const { euiTheme } = useEuiTheme();

  if (!user) {
    return <EuiAvatar name="" color={euiTheme.colors.lightestShade} initials="?" {...rest} />;
  }

  const displayName = getUserDisplayName(user);

  if (avatar?.imageUrl) {
    return <EuiAvatar name={displayName} imageUrl={avatar.imageUrl} color="plain" {...rest} />;
  }

  return (
    <EuiAvatar
      name={displayName}
      initials={getUserAvatarInitials(user, avatar)}
      initialsLength={USER_AVATAR_MAX_INITIALS}
      color={getUserAvatarColor(user, avatar)}
      {...rest}
    />
  );
};
