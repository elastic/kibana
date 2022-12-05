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

import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import type { ElasticUser } from '../../../containers/types';
import * as i18n from '../translations';
import type { UserInfoWithAvatar } from '../../user_profiles/types';
import { HoverableUserWithAvatar } from '../../user_profiles/hoverable_user_with_avatar';
import { convertToUserInfo } from '../../user_profiles/user_converter';

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
      <EuiFlexItem grow={false}>
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
      </EuiFlexItem>
    );
  }
);

UserList.displayName = 'UserList';

const getValidUsers = (
  users: ElasticUser[],
  userProfiles: Map<string, UserProfileWithAvatar>
): UserInfoWithAvatar[] => {
  const validUsers = users.reduce<Map<string, UserInfoWithAvatar>>((acc, user) => {
    const convertedUser = convertToUserInfo(user, userProfiles);
    if (convertedUser != null) {
      acc.set(convertedUser.key, convertedUser.userInfo);
    }

    return acc;
  }, new Map());

  return Array.from(validUsers.values());
};
