/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { lazy, Suspense, FunctionComponent } from 'react';
import ReactDOM from 'react-dom';
import { Router, useHistory } from 'react-router-dom';
import { History } from 'history';
import useAsync from 'react-use/lib/useAsync';
import { i18n } from '@kbn/i18n';
import {
  EuiAvatar,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import {
  ApplicationSetup,
  AppMountParameters,
  AppNavLinkStatus,
  StartServicesAccessor,
  NotificationsSetup,
  CoreStart,
} from '../../../../../src/core/public';
import {
  KibanaContextProvider,
  reactRouterNavigate,
} from '../../../../../src/plugins/kibana_react/public';
import { getUserDisplayName } from '../../common/model';
import { AuthenticationServiceSetup } from '../authentication';
import { TabbedRoutes } from './components/tabbed_routes';
import { Breadcrumb } from './components/breadcrumb';

interface CreateDeps {
  application: ApplicationSetup;
  authc: AuthenticationServiceSetup;
  getStartServices: StartServicesAccessor;
}

export const accountManagementApp = Object.freeze({
  id: 'security_account',
  create({ application, authc, getStartServices }: CreateDeps) {
    const title = i18n.translate('xpack.security.account.breadcrumb', {
      defaultMessage: 'Account Management',
    });

    application.register({
      id: this.id,
      title,
      navLinkStatus: AppNavLinkStatus.hidden,
      appRoute: '/security/account',
      async mount({ element, history }: AppMountParameters) {
        const [coreStart] = await getStartServices();

        ReactDOM.render(
          <Providers services={coreStart} history={history}>
            <Breadcrumb text={title} {...reactRouterNavigate(history, '')}>
              <AccountManagement authc={authc} notifications={coreStart.notifications} />
            </Breadcrumb>
          </Providers>,
          element
        );

        return () => ReactDOM.unmountComponentAtNode(element);
      },
    });
  },
});

export interface ProvidersProps {
  services: CoreStart;
  history: History;
}

export const Providers: FunctionComponent<ProvidersProps> = ({ services, history, children }) => (
  <KibanaContextProvider services={services}>
    <services.i18n.Context>
      <Router history={history}>{children}</Router>
    </services.i18n.Context>
  </KibanaContextProvider>
);

export interface AccountManagementProps {
  authc: AuthenticationServiceSetup;
  notifications: NotificationsSetup;
}

export const AccountManagement: FunctionComponent<AccountManagementProps> = ({
  authc,
  notifications,
}) => {
  const history = useHistory();
  const userState = useAsync(authc.getCurrentUser, [authc]);
  const AccountDetailsPage = lazy(() => import('./account_details_page'));
  const ApiKeysPage = lazy(() => import('./api_keys_page'));

  if (!userState.value) {
    return null;
  }

  const displayName = getUserDisplayName(userState.value);

  return (
    <EuiPage>
      <EuiPageBody restrictWidth>
        <EuiPageContent>
          <EuiPageContentHeader>
            <EuiPageContentHeaderSection>
              <EuiFlexGroup alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiAvatar name={displayName} size="xl" />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiTitle>
                    <h1>{displayName}</h1>
                  </EuiTitle>
                  <EuiText>{userState.value.email}</EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPageContentHeaderSection>
          </EuiPageContentHeader>
          <EuiPageContentBody>
            <TabbedRoutes
              routes={[
                {
                  id: 'account-details',
                  path: ['/', ''],
                  to: '',
                  exact: true,
                  name: i18n.translate('xpack.security.accountManagement.accountDetailsTab', {
                    defaultMessage: 'Account Details',
                  }),
                  content: (
                    <Suspense fallback={<EuiLoadingSpinner />}>
                      <AccountDetailsPage user={userState.value} notifications={notifications} />
                    </Suspense>
                  ),
                },
                {
                  id: 'api-keys',
                  path: '/api-keys',
                  to: 'api-keys',
                  name: i18n.translate('xpack.security.accountManagement.ApiKeysTab', {
                    defaultMessage: 'API Keys',
                  }),
                  content: (
                    <Breadcrumb
                      text={i18n.translate('xpack.security.accountManagement.ApiKeysTab', {
                        defaultMessage: 'API Keys',
                      })}
                      {...reactRouterNavigate(history, 'api-keys')}
                    >
                      <Suspense fallback={<EuiLoadingSpinner />}>
                        <ApiKeysPage />
                      </Suspense>
                    </Breadcrumb>
                  ),
                },
              ]}
            />
          </EuiPageContentBody>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};
