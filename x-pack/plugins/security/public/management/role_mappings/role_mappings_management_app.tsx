/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Route, Router, useParams } from 'react-router-dom';

import { i18n } from '@kbn/i18n';
import type { StartServicesAccessor } from 'src/core/public';
import type { RegisterManagementAppArgs } from 'src/plugins/management/public';

import {
  KibanaContextProvider,
  KibanaThemeProvider,
} from '../../../../../../src/plugins/kibana_react/public';
import {
  Breadcrumb,
  BreadcrumbsProvider,
  createBreadcrumbsChangeHandler,
} from '../../components/breadcrumb';
import type { PluginStartDependencies } from '../../plugin';
import { tryDecodeURIComponent } from '../url_utils';

interface CreateParams {
  getStartServices: StartServicesAccessor<PluginStartDependencies>;
}

export const roleMappingsManagementApp = Object.freeze({
  id: 'role_mappings',
  create({ getStartServices }: CreateParams) {
    const title = i18n.translate('xpack.security.management.roleMappingsTitle', {
      defaultMessage: 'Role Mappings',
    });

    return {
      id: this.id,
      order: 40,
      title,
      async mount({ element, theme$, setBreadcrumbs, history }) {
        const [
          [core],
          { RoleMappingsGridPage },
          { EditRoleMappingPage },
          { RoleMappingsAPIClient },
          { RolesAPIClient },
        ] = await Promise.all([
          getStartServices(),
          import('./role_mappings_grid'),
          import('./edit_role_mapping'),
          import('./role_mappings_api_client'),
          import('../roles'),
        ]);

        core.chrome.docTitle.change(title);

        const roleMappingsAPIClient = new RoleMappingsAPIClient(core.http);

        const EditRoleMappingsPageWithBreadcrumbs = ({ action }: { action: 'edit' | 'clone' }) => {
          const { name } = useParams<{ name?: string }>();

          // Additional decoding is a workaround for a bug in react-router's version of the `history` module.
          // See https://github.com/elastic/kibana/issues/82440
          const decodedName = name ? tryDecodeURIComponent(name) : undefined;

          const breadcrumbObj =
            action === 'edit' && name && decodedName
              ? { text: decodedName, href: `/edit/${encodeURIComponent(name)}` }
              : {
                  text: i18n.translate('xpack.security.roleMappings.createBreadcrumb', {
                    defaultMessage: 'Create',
                  }),
                };

          return (
            <Breadcrumb text={breadcrumbObj.text} href={breadcrumbObj.href}>
              <EditRoleMappingPage
                action={action}
                name={decodedName}
                roleMappingsAPI={roleMappingsAPIClient}
                rolesAPIClient={new RolesAPIClient(core.http)}
                notifications={core.notifications}
                docLinks={core.docLinks}
                history={history}
              />
            </Breadcrumb>
          );
        };

        render(
          <KibanaContextProvider services={core}>
            <core.i18n.Context>
              <KibanaThemeProvider theme$={theme$}>
                <Router history={history}>
                  <BreadcrumbsProvider
                    onChange={createBreadcrumbsChangeHandler(core.chrome, setBreadcrumbs)}
                  >
                    <Breadcrumb text={title} href="/">
                      <Route path={['/', '']} exact={true}>
                        <RoleMappingsGridPage
                          notifications={core.notifications}
                          rolesAPIClient={new RolesAPIClient(core.http)}
                          roleMappingsAPI={roleMappingsAPIClient}
                          docLinks={core.docLinks}
                          history={history}
                          navigateToApp={core.application.navigateToApp}
                        />
                      </Route>
                      <Route path="/edit/:name?">
                        <EditRoleMappingsPageWithBreadcrumbs action="edit" />
                      </Route>
                      <Route path="/clone/:name">
                        <EditRoleMappingsPageWithBreadcrumbs action="clone" />
                      </Route>
                    </Breadcrumb>
                  </BreadcrumbsProvider>
                </Router>
              </KibanaThemeProvider>
            </core.i18n.Context>
          </KibanaContextProvider>,
          element
        );

        return () => {
          unmountComponentAtNode(element);
        };
      },
    } as RegisterManagementAppArgs;
  },
});
