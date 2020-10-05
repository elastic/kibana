/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiAvatar } from '@elastic/eui';
import { isEmpty } from 'lodash/fp';

import { UserActionUsername } from './user_action_username';

interface UserActionUsernameWithAvatarProps {
  username: string;
  fullName?: string;
}

const UserActionUsernameWithAvatarComponent = ({
  username,
  fullName,
}: UserActionUsernameWithAvatarProps) => {
  return (
    <EuiFlexGroup
      responsive={false}
      alignItems="center"
      gutterSize="s"
      data-test-subj="user-action-username-with-avatar"
    >
      <EuiFlexItem grow={false}>
        <EuiAvatar
          size="s"
          name={isEmpty(fullName) ? username : fullName ?? ''}
          data-test-subj="user-action-username-avatar"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <UserActionUsername username={username} fullName={fullName} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const UserActionUsernameWithAvatar = memo(UserActionUsernameWithAvatarComponent);
