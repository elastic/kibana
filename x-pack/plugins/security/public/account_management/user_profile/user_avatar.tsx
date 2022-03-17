/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiAvatarProps } from '@elastic/eui';
import { EuiAvatar, shade, useEuiTheme } from '@elastic/eui';
import type { FunctionComponent, HTMLAttributes } from 'react';
import React from 'react';

import type { UserAvatar as IUserAvatar, UserInfo } from '../../../common';
import {
  getUserAvatarColor,
  getUserAvatarInitials,
  getUserDisplayName,
  USER_AVATAR_MAX_INITIALS,
} from '../../../common/model';

export interface UserAvatarProps extends Omit<HTMLAttributes<HTMLDivElement>, 'color'> {
  user?: Pick<UserInfo, 'username' | 'full_name'>;
  avatar?: IUserAvatar;
  size?: EuiAvatarProps['size'];
  isDisabled?: EuiAvatarProps['isDisabled'];
}

export const UserAvatar: FunctionComponent<UserAvatarProps> = ({ user, avatar, ...rest }) => {
  const { euiTheme, colorMode } = useEuiTheme();

  if (!user) {
    const color = colorMode === 'LIGHT' ? euiTheme.colors.lightShade : euiTheme.colors.mediumShade;
    return (
      <EuiAvatar
        name=""
        color={color}
        iconType="user"
        iconColor={shade(color, colorMode === 'LIGHT' ? 0.5 : 0.67)}
        {...rest}
      />
    );
  }

  const displayName = getUserDisplayName(user);

  if (avatar && avatar.imageUrl) {
    return <EuiAvatar name={displayName} imageUrl={avatar.imageUrl} {...rest} />;
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
