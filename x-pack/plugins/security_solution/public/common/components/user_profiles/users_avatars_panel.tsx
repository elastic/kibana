/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiNotificationBadge, EuiToolTip } from '@elastic/eui';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { UserAvatar } from '@kbn/user-profile-components';

import { UNKNOWN_USER_PROFILE_NAME } from './translations';
import {
  USERS_AVATARS_COUNT_BADGE_TEST_ID,
  USERS_AVATARS_PANEL_TEST_ID,
  USER_AVATAR_ITEM_TEST_ID,
} from './test_ids';

export type UserProfileOrUknown = UserProfileWithAvatar | undefined;

export interface UsersAvatarsPanelProps {
  /**
   * The array of user profiles
   */
  userProfiles: UserProfileOrUknown[];

  /**
   * Specifies how many avatars should be visible.
   * If more assignees passed, then badge with number of assignees will be shown instead.
   */
  maxVisibleAvatars?: number;
}

/**
 * Displays users avatars
 */
export const UsersAvatarsPanel: FC<UsersAvatarsPanelProps> = memo(
  ({ userProfiles, maxVisibleAvatars }) => {
    if (maxVisibleAvatars && userProfiles.length > maxVisibleAvatars) {
      return (
        <EuiToolTip
          position="top"
          content={userProfiles.map((user) => (
            <div>{user ? user.user.email ?? user.user.username : UNKNOWN_USER_PROFILE_NAME}</div>
          ))}
          repositionOnScroll={true}
        >
          <EuiNotificationBadge data-test-subj={USERS_AVATARS_COUNT_BADGE_TEST_ID} color="subdued">
            {userProfiles.length}
          </EuiNotificationBadge>
        </EuiToolTip>
      );
    }

    return (
      <EuiFlexGroup
        data-test-subj={USERS_AVATARS_PANEL_TEST_ID}
        alignItems="center"
        direction="row"
        gutterSize="xs"
      >
        {userProfiles.map((user, index) => (
          <EuiFlexItem key={index} grow={false}>
            <UserAvatar
              data-test-subj={USER_AVATAR_ITEM_TEST_ID(user?.user.username ?? `Unknown-${index}`)}
              user={user?.user}
              avatar={user?.data.avatar}
              size={'s'}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    );
  }
);

UsersAvatarsPanel.displayName = 'UsersAvatarsPanel';
