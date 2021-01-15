/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Router, Route, Switch, Redirect, RouteComponentProps } from 'react-router-dom';
import { History } from 'history';
import { i18n } from '@kbn/i18n';
import { I18nProvider } from '@kbn/i18n/react';
import { StartServicesAccessor, CoreStart } from '../../../../../../src/core/public';
import { RegisterManagementAppArgs } from '../../../../../../src/plugins/management/public';
import { KibanaContextProvider } from '../../../../../../src/plugins/kibana_react/public';
import { AuthenticationServiceSetup } from '../../authentication';
import { PluginStartDependencies } from '../../plugin';
import {
  BreadcrumbsProvider,
  BreadcrumbsChangeHandler,
  Breadcrumb,
  getDocTitle,
} from '../../components/breadcrumb';
import { AuthenticationProvider } from '../../components/use_current_user';
import { tryDecodeURIComponent } from '../url_utils';

interface CreateParams {
  authc: AuthenticationServiceSetup;
  getStartServices: StartServicesAccessor<PluginStartDependencies>;
}

interface EditUserParams {
  username: string;
}

export const usersManagementApp = Object.freeze({
  id: 'users',
  create({ authc, getStartServices }: CreateParams) {
    return {
      id: this.id,
      order: 10,
      title: i18n.translate('xpack.security.management.usersTitle', { defaultMessage: 'Users' }),
      async mount({ element, setBreadcrumbs, history }) {
        const [
          [coreStart],
          { UsersGridPage },
          { CreateUserPage, EditUserPage },
          { UserAPIClient },
          { RolesAPIClient },
        ] = await Promise.all([
          getStartServices(),
          import('./users_grid'),
          import('./edit_user'),
          import('./user_api_client'),
          import('../roles'),
        ]);

        render(
          <Providers
            services={coreStart}
            history={history}
            authc={authc}
            onChange={(breadcrumbs) => {
              setBreadcrumbs(breadcrumbs);
              coreStart.chrome.docTitle.change(getDocTitle(breadcrumbs));
            }}
          >
            <Breadcrumb
              text={i18n.translate('xpack.security.users.breadcrumb', {
                defaultMessage: 'Users',
              })}
              href="/"
            >
              <Switch>
                <Route path={['/', '']} exact>
                  <UsersGridPage
                    notifications={coreStart.notifications}
                    userAPIClient={new UserAPIClient(coreStart.http)}
                    rolesAPIClient={new RolesAPIClient(coreStart.http)}
                    history={history}
                    navigateToApp={coreStart.application.navigateToApp}
                  />
                </Route>
                <Route path="/create">
                  <Breadcrumb
                    text={i18n.translate('xpack.security.users.editUserPage.createBreadcrumb', {
                      defaultMessage: 'Create',
                    })}
                    href="/create"
                  >
                    <CreateUserPage />
                  </Breadcrumb>
                </Route>
                <Route
                  path="/edit/:username"
                  render={(props: RouteComponentProps<EditUserParams>) => {
                    // Additional decoding is a workaround for a bug in react-router's version of the `history` module.
                    // See https://github.com/elastic/kibana/issues/82440
                    const username = tryDecodeURIComponent(props.match.params.username);
                    return (
                      <Breadcrumb text={username} href={`/edit/${encodeURIComponent(username)}`}>
                        <EditUserPage username={username} />
                      </Breadcrumb>
                    );
                  }}
                />
                <Route path="/edit">
                  <Redirect to="/create" />
                </Route>
              </Switch>
            </Breadcrumb>
          </Providers>,
          element
        );

        return () => {
          unmountComponentAtNode(element);
        };
      },
    } as RegisterManagementAppArgs;
  },
});

export interface ProvidersProps {
  services: CoreStart;
  history: History;
  authc: AuthenticationServiceSetup;
  onChange?: BreadcrumbsChangeHandler;
}

export const Providers: FunctionComponent<ProvidersProps> = ({
  services,
  history,
  authc,
  onChange,
  children,
}) => (
  <KibanaContextProvider services={services}>
    <AuthenticationProvider authc={authc}>
      <I18nProvider>
        <Router history={history}>
          <BreadcrumbsProvider onChange={onChange}>{children}</BreadcrumbsProvider>
        </Router>
      </I18nProvider>
    </AuthenticationProvider>
  </KibanaContextProvider>
);
