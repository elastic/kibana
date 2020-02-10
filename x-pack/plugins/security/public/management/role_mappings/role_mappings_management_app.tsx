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
import { PluginStartDependencies } from '../../plugin';
import { RolesAPIClient } from '../roles';
import { RoleMappingsAPIClient } from './role_mappings_api_client';
import { DocumentationLinksService } from './documentation_links';
import { RoleMappingsGridPage } from './role_mappings_grid';
import { EditRoleMappingPage } from './edit_role_mapping';

interface CreateParams {
  getStartServices: CoreSetup<PluginStartDependencies>['getStartServices'];
}

export const roleMappingsManagementApp = Object.freeze({
  id: 'role_mappings',
  create({ getStartServices }: CreateParams) {
    return {
      id: this.id,
      order: 40,
      title: i18n.translate('xpack.security.management.roleMappingsTitle', {
        defaultMessage: 'Role Mappings',
      }),
      async mount({ basePath, element, setBreadcrumbs }) {
        const [{ docLinks, http, notifications, i18n: i18nStart }] = await getStartServices();
        const roleMappingsBreadcrumbs = [
          {
            text: i18n.translate('xpack.security.roleMapping.breadcrumb', {
              defaultMessage: 'Role Mappings',
            }),
            href: `#${basePath}`,
          },
        ];

        const roleMappingsAPIClient = new RoleMappingsAPIClient(http);
        const dockLinksService = new DocumentationLinksService(docLinks);
        const RoleMappingsGridPageWithBreadcrumbs = () => {
          setBreadcrumbs(roleMappingsBreadcrumbs);
          return (
            <RoleMappingsGridPage
              notifications={notifications}
              rolesAPIClient={new RolesAPIClient(http)}
              roleMappingsAPI={roleMappingsAPIClient}
              docLinks={dockLinksService}
            />
          );
        };

        const EditRoleMappingsPageWithBreadcrumbs = () => {
          const { name } = useParams<{ name?: string }>();

          setBreadcrumbs([
            ...roleMappingsBreadcrumbs,
            name
              ? { text: name, href: `#${basePath}/edit/${encodeURIComponent(name)}` }
              : {
                  text: i18n.translate('xpack.security.roleMappings.createBreadcrumb', {
                    defaultMessage: 'Create',
                  }),
                },
          ]);

          return (
            <EditRoleMappingPage
              name={name}
              roleMappingsAPI={roleMappingsAPIClient}
              rolesAPIClient={new RolesAPIClient(http)}
              notifications={notifications}
              docLinks={dockLinksService}
            />
          );
        };

        render(
          <i18nStart.Context>
            <Router basename={basePath}>
              <Switch>
                <Route path="/" exact={true}>
                  <RoleMappingsGridPageWithBreadcrumbs />
                </Route>
                <Route path="/edit/:name?">
                  <EditRoleMappingsPageWithBreadcrumbs />
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
