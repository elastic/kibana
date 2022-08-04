/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { CaseUserAvatar } from './user_avatar';
import * as i18n from '../../common/translations';
import { UserToolTip } from './user_tooltip';

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
              {profile.user.display_name ??
                profile.user.full_name ??
                profile.user.email ??
                profile.user.username ??
                i18n.UNKNOWN}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
UserAvatarWithName.displayName = 'UserAvatarWithName';

interface UserRepresentationProps {
  profile: UserProfileWithAvatar;
}

const UserRepresentationComponent: React.FC<UserRepresentationProps> = ({ profile }) => {
  return (
    <EuiFlexGroup alignItems="center" gutterSize="s">
      <EuiFlexItem grow={false}>
        <UserToolTip profile={profile}>
          <UserAvatarWithName profile={profile} />
        </UserToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

UserRepresentationComponent.displayName = 'UserRepresentation';

export const UserRepresentation = React.memo(UserRepresentationComponent);
