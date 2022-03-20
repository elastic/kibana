/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { UserActionAvatar } from './avatar';
import { UserActionUsername } from './username';

interface UserActionUsernameWithAvatarProps {
  username?: string | null;
  fullName?: string | null;
}

const UserActionUsernameWithAvatarComponent = ({
  username,
  fullName,
}: UserActionUsernameWithAvatarProps) => (
  <EuiFlexGroup
    responsive={false}
    alignItems="center"
    gutterSize="s"
    data-test-subj="user-action-username-with-avatar"
  >
    <EuiFlexItem grow={false}>
      <UserActionAvatar username={username} fullName={fullName} size="s" />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <UserActionUsername username={username} fullName={fullName} />
    </EuiFlexItem>
  </EuiFlexGroup>
);
UserActionUsernameWithAvatarComponent.displayName = 'UserActionUsernameWithAvatar';

export const UserActionUsernameWithAvatar = memo(UserActionUsernameWithAvatarComponent);
