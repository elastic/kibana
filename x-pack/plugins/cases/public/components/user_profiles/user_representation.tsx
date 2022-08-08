/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { css } from '@emotion/react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiText, EuiToolTip } from '@elastic/eui';
import { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { CaseUserAvatar } from './user_avatar';
import { UserToolTip } from './user_tooltip';
import { getName } from './display_name';
import * as i18n from './translations';

const UserAvatarWithName: React.FC<{ profile: UserProfileWithAvatar }> = ({ profile }) => {
  return (
    <EuiFlexGroup alignItems="center" gutterSize="s">
      <EuiFlexItem grow={false}>
        <CaseUserAvatar profile={profile} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup direction={'column'} gutterSize="none">
          <EuiFlexItem>
            <EuiText size="s" className="eui-textBreakWord">
              {getName(profile.user)}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
UserAvatarWithName.displayName = 'UserAvatarWithName';

// TODO: this isn't working
const RemoveUser = css`
  .child {
    visibility: hidden;
  }

  .parent:hover .child {
    visibility: visible;
  }
`;

interface UserRepresentationProps {
  profile: UserProfileWithAvatar;
  onRemoveAssignee: (removedAssigneeUID: string) => void;
}

const UserRepresentationComponent: React.FC<UserRepresentationProps> = ({
  profile,
  onRemoveAssignee,
}) => {
  const removeAssigneeCallback = useCallback(
    () => onRemoveAssignee(profile.uid),
    [onRemoveAssignee, profile.uid]
  );

  return (
    <EuiFlexGroup
      css={RemoveUser}
      className="parent"
      alignItems="center"
      gutterSize="s"
      justifyContent="spaceBetween"
    >
      <EuiFlexItem grow={false}>
        <UserToolTip profile={profile}>
          <UserAvatarWithName profile={profile} />
        </UserToolTip>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip
          position="left"
          content={i18n.REMOVE_ASSIGNEE}
          data-test-subj="user-profile-assigned-user-cross-tooltip"
        >
          <EuiButtonIcon
            aria-label={i18n.REMOVE_ASSIGNEE_ARIA_LABEL}
            css={RemoveUser}
            className="child"
            iconType="cross"
            color="danger"
            iconSize="m"
            onClick={removeAssigneeCallback}
          />
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

UserRepresentationComponent.displayName = 'UserRepresentation';

export const UserRepresentation = React.memo(UserRepresentationComponent);
