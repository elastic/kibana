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
  EuiAvatar,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiToolTip,
  EuiTitle,
  EuiSpacer,
} from '@elastic/eui';

import { ElasticUser } from '../../containers/types';
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

const renderUsers = (
  users: ElasticUser[],
  handleSendEmail: (emailAddress: string | undefined | null) => void
) =>
  users.map(({ fullName, username, email }, key) => (
    <div key={key}>
      <EuiFlexGroup key={key} justifyContent="spaceBetween" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup responsive={false} alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiAvatar name={fullName ? fullName : username ?? ''} size="s" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {fullName ? (
                <EuiToolTip position="top" content={<p>{fullName ? fullName : username ?? ''}</p>}>
                  <EuiText size="xs">
                    <p>
                      <span data-test-subj="case-view-username">{username}</span>
                    </p>
                  </EuiText>
                </EuiToolTip>
              ) : (
                <EuiText size="xs">
                  <p>
                    <span data-test-subj="case-view-username">{username}</span>
                  </p>
                </EuiText>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        {isEmpty(email) === false && (
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              data-test-subj="user-list-email-button"
              onClick={handleSendEmail.bind(null, email)}
              iconType="email"
              aria-label={i18n.SEND_EMAIL_ARIA(fullName ? fullName : username ?? '')}
              isDisabled={isEmpty(email)}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="s" />
    </div>
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
    <>
      <EuiTitle size="xs">
        <h4>{headline}</h4>
      </EuiTitle>
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
      <EuiSpacer />
    </>
  ) : null;
});

UserList.displayName = 'UserList';
