/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiPage, EuiPageBody, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import { NotificationsStart } from 'src/core/public';
import { getUserDisplayName, AuthenticatedUser } from '../../common/model';
import { AuthenticationServiceSetup } from '../authentication';
import { ChangePassword } from './change_password';
import { UserAPIClient } from '../management';
import { PersonalInfo } from './personal_info';

interface Props {
  authc: AuthenticationServiceSetup;
  userAPIClient: PublicMethodsOf<UserAPIClient>;
  notifications: NotificationsStart;
}

export const AccountManagementPage = ({ userAPIClient, authc, notifications }: Props) => {
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null);
  useEffect(() => {
    authc.getCurrentUser().then(setCurrentUser);
  }, [authc]);

  if (!currentUser) {
    return null;
  }

  return (
    <EuiPage>
      <EuiPageBody restrictWidth>
        <EuiPanel>
          <EuiText data-test-subj={'userDisplayName'}>
            <h1>{getUserDisplayName(currentUser)}</h1>
          </EuiText>

          <EuiSpacer size="xl" />

          <PersonalInfo user={currentUser} />

          <ChangePassword
            user={currentUser}
            userAPIClient={userAPIClient}
            notifications={notifications}
          />
        </EuiPanel>
      </EuiPageBody>
    </EuiPage>
  );
};
