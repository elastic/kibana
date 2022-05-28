/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiAvatar, EuiAvatarProps } from '@elastic/eui';

import * as i18n from './translations';

interface UserActionAvatarProps {
  username?: string | null;
  fullName?: string | null;
  size?: EuiAvatarProps['size'];
}

const UserActionAvatarComponent = ({ username, fullName, size = 'm' }: UserActionAvatarProps) => {
  const avatarName = fullName && fullName.length > 0 ? fullName : username ?? i18n.UNKNOWN;
  return <EuiAvatar name={avatarName} data-test-subj={`user-action-avatar`} size={size} />;
};
UserActionAvatarComponent.displayName = 'UserActionAvatar';

export const UserActionAvatar = memo(UserActionAvatarComponent);
