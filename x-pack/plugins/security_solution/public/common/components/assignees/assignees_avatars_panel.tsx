/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiNotificationBadge,
  EuiToolTip,
} from '@elastic/eui';
import { UserAvatar } from '@kbn/user-profile-components';

import { useGetUserProfiles } from '../../../detections/containers/detection_engine/user_profiles/use_get_user_profiles';
import {
  ASSIGNEES_AVATAR_ITEM_TEST_ID,
  ASSIGNEES_AVATARS_COUNT_BADGE_TEST_ID,
  ASSIGNEES_AVATARS_LOADING_TEST_ID,
  ASSIGNEES_AVATARS_PANEL_TEST_ID,
} from './test_ids';

export interface AssigneesProps {
  /**
   * The array of assignees
   */
  assignedUserIds: string[];

  /**
   * Specifies how many avatars should be visible.
   * If more assignees passed, then badge with number of assignees will be shown instead.
   */
  maxVisibleAvatars?: number;
}

/**
 * Displays assignees avatars
 */
export const AssigneesAvatarsPanel: FC<AssigneesProps> = memo(
  ({ assignedUserIds, maxVisibleAvatars }) => {
    const { loading: isLoading, userProfiles } = useGetUserProfiles(assignedUserIds);
    const assignees = userProfiles?.filter((user) => assignedUserIds.includes(user.uid)) ?? [];

    if (isLoading) {
      return <EuiLoadingSpinner data-test-subj={ASSIGNEES_AVATARS_LOADING_TEST_ID} size={'s'} />;
    }

    if (maxVisibleAvatars && assignees.length > maxVisibleAvatars) {
      return (
        <EuiToolTip
          position="top"
          content={assignees.map((user) => (
            <div>{user.user.email ?? user.user.username}</div>
          ))}
          repositionOnScroll={true}
        >
          <EuiNotificationBadge
            data-test-subj={ASSIGNEES_AVATARS_COUNT_BADGE_TEST_ID}
            color="subdued"
          >
            {assignees.length}
          </EuiNotificationBadge>
        </EuiToolTip>
      );
    }

    return (
      <EuiFlexGroup
        data-test-subj={ASSIGNEES_AVATARS_PANEL_TEST_ID}
        alignItems="center"
        direction="row"
        gutterSize="xs"
      >
        {assignees.map((user) => (
          <EuiFlexItem key={user.uid} grow={false}>
            <UserAvatar
              data-test-subj={ASSIGNEES_AVATAR_ITEM_TEST_ID(user.user.username)}
              user={user.user}
              avatar={user.data.avatar}
              size={'s'}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    );
  }
);

AssigneesAvatarsPanel.displayName = 'AssigneesAvatarsPanel';
