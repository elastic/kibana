/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiAvatar,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import React, { useCallback } from 'react';
import styled, { css } from 'styled-components';
import type { ElasticUser } from '../../../common/ui/types';
import * as i18n from './translations';

interface UserListProps {
  email: {
    subject: string;
    body: string;
  };
  headline: string;
  loading?: boolean;
  users: ElasticUser[];
}

const MyAvatar = styled(EuiAvatar)`
  top: -4px;
`;

const MyFlexGroup = styled(EuiFlexGroup)`
  ${({ theme }) => css`
    margin-top: ${theme.eui.euiSizeM};
  `}
`;

const renderUsers = (
  users: ElasticUser[],
  handleSendEmail: (emailAddress: string | undefined | null) => void
) =>
  users.map(({ fullName, username, email }, key) => (
    <MyFlexGroup key={key} justifyContent="spaceBetween" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="xs" responsive={false}>
          <EuiFlexItem grow={false}>
            <MyAvatar name={fullName ? fullName : username ?? ''} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip position="top" content={<p>{fullName ? fullName : username ?? ''}</p>}>
              <p>
                <strong>
                  <small data-test-subj="case-view-username">{username}</small>
                </strong>
              </p>
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          data-test-subj="user-list-email-button"
          onClick={handleSendEmail.bind(null, email)}
          iconType="email"
          aria-label={i18n.SEND_EMAIL_ARIA(fullName ? fullName : username ?? '')}
          isDisabled={isEmpty(email)}
        />
      </EuiFlexItem>
    </MyFlexGroup>
  ));

export const UserList = React.memo(({ email, headline, loading, users }: UserListProps) => {
  const handleSendEmail = useCallback(
    (emailAddress: string | undefined | null) => {
      if (emailAddress && emailAddress != null) {
        window.open(`mailto:${emailAddress}?subject=${email.subject}&body=${email.body}`, '_blank');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [email.subject]
  );
  return users.filter(({ username }) => username != null && username !== '').length > 0 ? (
    <EuiText>
      <h4>{headline}</h4>
      <EuiHorizontalRule margin="xs" />
      {loading && (
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiLoadingSpinner />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
      {renderUsers(
        users.filter(({ username }) => username != null && username !== ''),
        handleSendEmail
      )}
    </EuiText>
  ) : null;
});

UserList.displayName = 'UserList';
