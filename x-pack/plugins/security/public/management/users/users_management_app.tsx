/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { HashRouter as Router, Route, Switch, useParams } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { CoreSetup } from 'src/core/public';
import { RegisterManagementAppArgs } from '../../../../../../src/plugins/management/public';
import { AuthenticationServiceSetup } from '../../authentication';
import { PluginStartDependencies } from '../../plugin';
import { RolesAPIClient } from '../roles';
import { UserAPIClient } from './user_api_client';
import { UsersGridPage } from './users_grid';
import { EditUserPage } from './edit_user';

interface CreateParams {
  authc: AuthenticationServiceSetup;
  getStartServices: CoreSetup<PluginStartDependencies>['getStartServices'];
}

export const usersManagementApp = Object.freeze({
  id: 'users',
  create({ authc, getStartServices }: CreateParams) {
    return {
      id: this.id,
      order: 10,
      title: i18n.translate('xpack.security.management.usersTitle', { defaultMessage: 'Users' }),
      async mount({ basePath, element, setBreadcrumbs }) {
        const [{ http, notifications, i18n: i18nStart }] = await getStartServices();
        const usersBreadcrumbs = [
          {
            text: i18n.translate('xpack.security.users.breadcrumb', { defaultMessage: 'Users' }),
            href: `#${basePath}`,
          },
        ];

        const userAPIClient = new UserAPIClient(http);
        const rolesAPIClient = new RolesAPIClient(http);
        const UsersGridPageWithBreadcrumbs = () => {
          setBreadcrumbs(usersBreadcrumbs);
          return (
            <UsersGridPage
              notifications={notifications}
              userAPIClient={userAPIClient}
              rolesAPIClient={rolesAPIClient}
            />
          );
        };

        const EditUserPageWithBreadcrumbs = () => {
          const { username } = useParams<{ username?: string }>();

          setBreadcrumbs([
            ...usersBreadcrumbs,
            username
              ? { text: username, href: `#${basePath}/edit/${encodeURIComponent(username)}` }
              : {
                  text: i18n.translate('xpack.security.users.createBreadcrumb', {
                    defaultMessage: 'Create',
                  }),
                },
          ]);

          return (
            <EditUserPage
              authc={authc}
              userAPIClient={userAPIClient}
              rolesAPIClient={new RolesAPIClient(http)}
              notifications={notifications}
              username={username}
            />
          );
        };

        render(
          <i18nStart.Context>
            <Router basename={basePath}>
              <Switch>
                <Route path="/" exact>
                  <UsersGridPageWithBreadcrumbs />
                </Route>
                <Route path="/edit/:username?">
                  <EditUserPageWithBreadcrumbs />
                </Route>
              </Switch>
            </Router>
          </i18nStart.Context>,
          element
        );

        return () => {
          unmountComponentAtNode(element);
        };
      },
    } as RegisterManagementAppArgs;
  },
});
