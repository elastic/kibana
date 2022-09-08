/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { isEmpty } from 'lodash/fp';

import {
  EuiButtonIcon,
  EuiText,
  EuiHorizontalRule,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
} from '@elastic/eui';

import styled, { css } from 'styled-components';

import { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { ElasticUser } from '../../../containers/types';
import * as i18n from '../translations';
import { UserInfoWithAvatar } from '../../user_profiles/types';
import { HoverableUserWithAvatar } from '../../user_profiles/hoverable_user_with_avatar';

interface UserListProps {
  email: {
    subject: string;
    body: string;
  };
  headline: string;
  loading?: boolean;
  users: ElasticUser[];
  userProfiles?: Map<string, UserProfileWithAvatar>;
  dataTestSubj?: string;
}

const MyFlexGroup = styled(EuiFlexGroup)`
  ${({ theme }) => css`
    margin-top: ${theme.eui.euiSizeM};
  `}
`;

const renderUsers = (
  users: UserInfoWithAvatar[],
  handleSendEmail: (emailAddress: string | undefined | null) => void
) =>
  users.map((userInfo, key) => (
    <MyFlexGroup key={key} justifyContent="spaceBetween" responsive={false}>
      <EuiFlexItem grow={false}>
        <HoverableUserWithAvatar userInfo={userInfo} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          data-test-subj="user-list-email-button"
          onClick={handleSendEmail.bind(null, userInfo.user?.email)}
          iconType="email"
          aria-label={i18n.SEND_EMAIL_ARIA(
            userInfo.user?.full_name ? userInfo.user?.full_name : userInfo.user?.username ?? ''
          )}
          isDisabled={isEmpty(userInfo.user?.email)}
        />
      </EuiFlexItem>
    </MyFlexGroup>
  ));

export const UserList: React.FC<UserListProps> = React.memo(
  ({ email, headline, loading, users, userProfiles, dataTestSubj }) => {
    const handleSendEmail = useCallback(
      (emailAddress: string | undefined | null) => {
        if (emailAddress && emailAddress != null) {
          window.open(
            `mailto:${emailAddress}?subject=${email.subject}&body=${email.body}`,
            '_blank'
          );
        }
      },
      [email.body, email.subject]
    );

    const validUsers = getValidUsers(users, userProfiles ?? new Map());

    if (validUsers.length === 0) {
      return null;
    }

    return (
      <EuiText data-test-subj={dataTestSubj}>
        <h4>{headline}</h4>
        <EuiHorizontalRule margin="xs" />
        {loading && (
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiLoadingSpinner />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
        {renderUsers(validUsers, handleSendEmail)}
      </EuiText>
    );
  }
);

UserList.displayName = 'UserList';

const getValidUsers = (
  users: ElasticUser[],
  userProfiles: Map<string, UserProfileWithAvatar>
): UserInfoWithAvatar[] => {
  const validUsers = users.reduce<Map<string, UserInfoWithAvatar>>((acc, user) => {
    const addUserToMap = (username: string) => {
      acc.set(username, {
        user: { username, full_name: user?.fullName ?? undefined, email: user?.email ?? undefined },
      });
    };

    const username = user.username;

    if (user.profileUid != null) {
      const profile = userProfiles.get(user.profileUid);

      if (profile != null) {
        acc.set(profile.uid, profile);
      } else if (isValidString(username)) {
        // we couldn't find a valid profile so let's try the username
        addUserToMap(username);
      } else {
        // didn't the username wasn't valid so we'll show an unknown user
        acc.set(user.profileUid, {});
      }
    } else if (isValidString(username)) {
      addUserToMap(username);
    }

    return acc;
  }, new Map());

  return Array.from(validUsers.values());
};

const isValidString = (value?: string | null): value is string => !isEmpty(value);
