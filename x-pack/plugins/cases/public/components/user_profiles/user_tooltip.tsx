/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiText, EuiToolTip } from '@elastic/eui';
import { UserProfileUserInfo, UserProfileWithAvatar } from '@kbn/user-profile-components';
import { CaseUserAvatar } from './user_avatar';
import { getName } from './display_name';
import * as i18n from './translations';

const UserFullInformation: React.FC<{ profile?: UserProfileWithAvatar }> = React.memo(
  ({ profile }) => {
    if (profile?.user.full_name) {
      return (
        <EuiText size="s" className="eui-textBreakWord">
          <strong data-test-subj="user-profile-tooltip-full-name">{profile.user.full_name}</strong>
        </EuiText>
      );
    }

    return (
      <EuiText
        size="s"
        className="eui-textBreakWord"
        data-test-subj="user-profile-tooltip-single-name"
      >
        <strong>{getNameOrMissingText(profile?.user)}</strong>
      </EuiText>
    );
  }
);

const getNameOrMissingText = (user?: UserProfileUserInfo) => {
  if (!user) {
    return i18n.MISSING_PROFILE;
  }

  return getName(user);
};

UserFullInformation.displayName = 'UserFullInformation';

interface UserFullRepresentationProps {
  profile?: UserProfileWithAvatar;
}

const UserFullRepresentationComponent: React.FC<UserFullRepresentationProps> = ({ profile }) => {
  return (
    <EuiFlexGroup alignItems="center" gutterSize="s">
      <EuiFlexItem grow={false} data-test-subj="user-profile-tooltip-avatar">
        <CaseUserAvatar size={'m'} profile={profile} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup direction={'column'} gutterSize="none">
          <EuiFlexItem>
            <UserFullInformation profile={profile} />
          </EuiFlexItem>
          {profile && displayEmail(profile) && (
            <EuiFlexItem grow={false}>
              <EuiText
                size="s"
                className="eui-textBreakWord"
                data-test-subj="user-profile-tooltip-email"
              >
                {profile.user.email}
              </EuiText>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

UserFullRepresentationComponent.displayName = 'UserFullRepresentation';

const displayEmail = (profile?: UserProfileWithAvatar) => {
  return profile?.user.full_name && profile?.user.email;
};

export interface UserToolTipProps {
  children: React.ReactElement;
  profile?: UserProfileWithAvatar;
}

const UserToolTipComponent: React.FC<UserToolTipProps> = ({ children, profile }) => {
  return (
    <EuiToolTip
      display="inlineBlock"
      position="top"
      content={<UserFullRepresentationComponent profile={profile} />}
      data-test-subj="user-profile-tooltip"
    >
      {children}
    </EuiToolTip>
  );
};

UserToolTipComponent.displayName = 'UserToolTip';
export const UserToolTip = React.memo(UserToolTipComponent);
