/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Route, Router, Switch, useParams } from 'react-router-dom';

import { i18n } from '@kbn/i18n';
import type { FatalErrorsSetup, StartServicesAccessor } from 'src/core/public';
import type { RegisterManagementAppArgs } from 'src/plugins/management/public';

import { KibanaContextProvider } from '../../../../../../src/plugins/kibana_react/public';
import type { SecurityLicense } from '../../../common/licensing';
import type { PluginStartDependencies } from '../../plugin';
import { tryDecodeURIComponent } from '../url_utils';

interface CreateParams {
  fatalErrors: FatalErrorsSetup;
  license: SecurityLicense;
  getStartServices: StartServicesAccessor<PluginStartDependencies>;
}

export const rolesManagementApp = Object.freeze({
  id: 'roles',
  create({ license, fatalErrors, getStartServices }: CreateParams) {
    const title = i18n.translate('xpack.security.management.rolesTitle', {
      defaultMessage: 'Roles',
    });
    return {
      id: this.id,
      order: 20,
      title,
      async mount({ element, setBreadcrumbs, history }) {
        const rolesBreadcrumbs = [
          {
            text: title,
            href: `/`,
          },
        ];

        const [
          [startServices, { data, features, spaces }],
          { RolesGridPage },
          { EditRolePage },
          { RolesAPIClient },
          { IndicesAPIClient },
          { PrivilegesAPIClient },
          { UserAPIClient },
        ] = await Promise.all([
          getStartServices(),
          import('./roles_grid'),
          import('./edit_role'),
          import('./roles_api_client'),
          import('./indices_api_client'),
          import('./privileges_api_client'),
          import('../users'),
        ]);

        const {
          application,
          docLinks,
          http,
          i18n: i18nStart,
          notifications,
          chrome,
        } = startServices;

        chrome.docTitle.change(title);

        const rolesAPIClient = new RolesAPIClient(http);
        const RolesGridPageWithBreadcrumbs = () => {
          setBreadcrumbs(rolesBreadcrumbs);
          return (
            <RolesGridPage
              notifications={notifications}
              rolesAPIClient={rolesAPIClient}
              history={history}
            />
          );
        };

        const EditRolePageWithBreadcrumbs = ({ action }: { action: 'edit' | 'clone' }) => {
          const { roleName } = useParams<{ roleName?: string }>();

          // Additional decoding is a workaround for a bug in react-router's version of the `history` module.
          // See https://github.com/elastic/kibana/issues/82440
          const decodedRoleName = roleName ? tryDecodeURIComponent(roleName) : undefined;

          setBreadcrumbs([
            ...rolesBreadcrumbs,
            action === 'edit' && roleName
              ? { text: decodedRoleName, href: `/edit/${encodeURIComponent(roleName)}` }
              : {
                  text: i18n.translate('xpack.security.roles.createBreadcrumb', {
                    defaultMessage: 'Create',
                  }),
                },
          ]);

          const spacesApiUi = spaces?.ui;

          return (
            <EditRolePage
              action={action}
              roleName={decodedRoleName}
              rolesAPIClient={rolesAPIClient}
              userAPIClient={new UserAPIClient(http)}
              indicesAPIClient={new IndicesAPIClient(http)}
              privilegesAPIClient={new PrivilegesAPIClient(http)}
              getFeatures={features.getFeatures}
              http={http}
              notifications={notifications}
              fatalErrors={fatalErrors}
              license={license}
              docLinks={docLinks}
              uiCapabilities={application.capabilities}
              indexPatterns={data.indexPatterns}
              history={history}
              spacesApiUi={spacesApiUi}
            />
          );
        };

        render(
          <KibanaContextProvider services={startServices}>
            <i18nStart.Context>
              <Router history={history}>
                <Switch>
                  <Route path={['/', '']} exact={true}>
                    <RolesGridPageWithBreadcrumbs />
                  </Route>
                  <Route path="/edit/:roleName?">
                    <EditRolePageWithBreadcrumbs action="edit" />
                  </Route>
                  <Route path="/clone/:roleName">
                    <EditRolePageWithBreadcrumbs action="clone" />
                  </Route>
                </Switch>
              </Router>
            </i18nStart.Context>
          </KibanaContextProvider>,

          element
        );

        return () => {
          chrome.docTitle.reset();
          unmountComponentAtNode(element);
        };
      },
    } as RegisterManagementAppArgs;
  },
});
