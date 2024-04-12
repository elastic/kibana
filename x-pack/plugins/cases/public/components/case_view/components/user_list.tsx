/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { isEmpty } from 'lodash/fp';
import { sortBy } from 'lodash';

import type { EuiThemeComputed } from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiText,
  EuiHorizontalRule,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  useEuiTheme,
} from '@elastic/eui';

import { css } from '@emotion/react';

import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { useCaseViewNavigation } from '../../../common/navigation';
import type { CaseUI } from '../../../containers/types';
import * as i18n from '../translations';
import type { CaseUserWithProfileInfo, UserInfoWithAvatar } from '../../user_profiles/types';
import { HoverableUserWithAvatar } from '../../user_profiles/hoverable_user_with_avatar';
import { convertToUserInfo } from '../../user_profiles/user_converter';
import { getSortField } from '../../user_profiles/sort';

interface UserListProps {
  theCase: CaseUI;
  headline: string;
  loading?: boolean;
  users: CaseUserWithProfileInfo[];
  userProfiles?: Map<string, UserProfileWithAvatar>;
  dataTestSubj?: string;
}

const renderUsers = (
  users: UserInfoWithAvatar[],
  handleSendEmail: (emailAddress: string | undefined | null) => void,
  euiTheme: EuiThemeComputed<{}>
) =>
  users.map((userInfo, key) => (
    <EuiFlexGroup
      css={css`
        margin-top: ${euiTheme.size.m};
      `}
      key={key}
      justifyContent="spaceBetween"
      responsive={false}
    >
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
    </EuiFlexGroup>
  ));

const getEmailContent = ({ caseTitle, caseUrl }: { caseTitle: string; caseUrl: string }) => ({
  subject: i18n.EMAIL_SUBJECT(caseTitle),
  body: i18n.EMAIL_BODY(caseUrl),
});

export const UserList: React.FC<UserListProps> = React.memo(
  ({ theCase, userProfiles, headline, loading, users, dataTestSubj }) => {
    const { getCaseViewUrl } = useCaseViewNavigation();
    const { euiTheme } = useEuiTheme();
    const caseUrl = getCaseViewUrl({ detailName: theCase.id });
    const email = getEmailContent({ caseTitle: theCase.title, caseUrl });

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
    const orderedUsers = sortBy(validUsers, getSortField);

    if (orderedUsers.length === 0) {
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
                <EuiLoadingSpinner data-test-subj="users-list-loading-spinner" />
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
          {renderUsers(orderedUsers, handleSendEmail, euiTheme)}
        </EuiText>
      </EuiFlexItem>
    );
  }
);

UserList.displayName = 'UserList';

const getValidUsers = (
  users: CaseUserWithProfileInfo[],
  userProfiles: Map<string, UserProfileWithAvatar>
): UserInfoWithAvatar[] => {
  const validUsers = users.reduce<Map<string, UserInfoWithAvatar>>((acc, user) => {
    const userCamelCase = {
      email: user.user.email,
      fullName: user.user.full_name,
      username: user.user.username,
      profileUid: user.uid,
    };

    const convertedUser = convertToUserInfo(userCamelCase, userProfiles);

    if (convertedUser != null) {
      acc.set(convertedUser.key, convertedUser.userInfo);
    }

    return acc;
  }, new Map());

  return Array.from(validUsers.values());
};
