/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPage, EuiPageBody, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';

import type { AppMountParameters, CoreStart, NotificationsStart } from '@kbn/core/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import type { PublicMethodsOf } from '@kbn/utility-types';

import type { AuthenticatedUser } from '../../common/model';
import { getUserDisplayName } from '../../common/model';
import type { AuthenticationServiceSetup } from '../authentication';
import type { UserAPIClient } from '../management';
import { ChangePassword } from './change_password';
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
            <h1>
              <FormattedMessage
                id="xpack.security.account.pageTitle"
                defaultMessage="Settings for {strongUsername}"
                values={{ strongUsername: <strong>{getUserDisplayName(currentUser)}</strong> }}
              />
            </h1>
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

export function renderAccountManagementPage(
  i18nStart: CoreStart['i18n'],
  { element, theme$ }: Pick<AppMountParameters, 'element' | 'theme$'>,
  props: Props
) {
  ReactDOM.render(
    <i18nStart.Context>
      <KibanaThemeProvider theme$={theme$}>
        <AccountManagementPage {...props} />
      </KibanaThemeProvider>
    </i18nStart.Context>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
}
