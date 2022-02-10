/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { History } from 'history';
import type { FunctionComponent } from 'react';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import type { RouteComponentProps } from 'react-router-dom';
import { Redirect, Route, Router, Switch } from 'react-router-dom';
import type { Observable } from 'rxjs';

import { i18n } from '@kbn/i18n';
import { I18nProvider } from '@kbn/i18n-react';
import type { CoreStart, CoreTheme, StartServicesAccessor } from 'src/core/public';
import type { RegisterManagementAppArgs } from 'src/plugins/management/public';

import {
  KibanaContextProvider,
  KibanaThemeProvider,
} from '../../../../../../src/plugins/kibana_react/public';
import type { AuthenticationServiceSetup } from '../../authentication';
import type { BreadcrumbsChangeHandler } from '../../components/breadcrumb';
import {
  Breadcrumb,
  BreadcrumbsProvider,
  createBreadcrumbsChangeHandler,
} from '../../components/breadcrumb';
import { AuthenticationProvider } from '../../components/use_current_user';
import type { PluginStartDependencies } from '../../plugin';
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
    const title = i18n.translate('xpack.security.management.usersTitle', {
      defaultMessage: 'Users',
    });
    return {
      id: this.id,
      order: 10,
      title,
      async mount({ element, theme$, setBreadcrumbs, history }) {
        const [
          [coreStart],
          { UsersGridPage },
          { CreateUserPage, EditUserPage },
          { UserAPIClient },
          { RolesAPIClient },
        ] = await Promise.all([
          getStartServices(), // TODO: remove this and write test.
          import('./users_grid'),
          import('./edit_user'),
          import('./user_api_client'),
          import('../roles'),
        ]);

        render(
          <Providers
            services={coreStart}
            theme$={theme$}
            history={history}
            authc={authc}
            onChange={createBreadcrumbsChangeHandler(coreStart.chrome, setBreadcrumbs)}
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
  theme$: Observable<CoreTheme>;
  history: History;
  authc: AuthenticationServiceSetup;
  onChange?: BreadcrumbsChangeHandler;
}

export const Providers: FunctionComponent<ProvidersProps> = ({
  services,
  theme$,
  history,
  authc,
  onChange,
  children,
}) => (
  <KibanaContextProvider services={services}>
    <AuthenticationProvider authc={authc}>
      <I18nProvider>
        <KibanaThemeProvider theme$={theme$}>
          <Router history={history}>
            <BreadcrumbsProvider onChange={onChange}>{children}</BreadcrumbsProvider>
          </Router>
        </KibanaThemeProvider>
      </I18nProvider>
    </AuthenticationProvider>
  </KibanaContextProvider>
);
