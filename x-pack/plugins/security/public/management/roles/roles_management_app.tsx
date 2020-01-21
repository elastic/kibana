/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { HashRouter as Router, Route, Switch, useParams } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { CoreSetup, FatalErrorsSetup } from 'src/core/public';
import { RegisterManagementAppArgs } from '../../../../../../src/plugins/management/public';
import { SecurityLicense } from '../../../common/licensing';
import { PluginStartDependencies } from '../../plugin';
import { UserAPIClient } from '../users';
import { RolesAPIClient } from './roles_api_client';
import { RolesGridPage } from './roles_grid';
import { EditRolePage } from './edit_role';
import { DocumentationLinksService } from './documentation_links';
import { IndicesAPIClient } from './indices_api_client';
import { PrivilegesAPIClient } from './privileges_api_client';

interface CreateParams {
  fatalErrors: FatalErrorsSetup;
  license: SecurityLicense;
  getStartServices: CoreSetup<PluginStartDependencies>['getStartServices'];
}

export const rolesManagementApp = Object.freeze({
  id: 'roles',
  create({ license, fatalErrors, getStartServices }: CreateParams) {
    return {
      id: this.id,
      order: 20,
      title: i18n.translate('xpack.security.management.rolesTitle', { defaultMessage: 'Roles' }),
      async mount({ basePath, element, setBreadcrumbs }) {
        const [
          { application, docLinks, http, i18n: i18nStart, injectedMetadata, notifications },
          { data },
        ] = await getStartServices();

        const rolesBreadcrumbs = [
          {
            text: i18n.translate('xpack.security.roles.breadcrumb', { defaultMessage: 'Roles' }),
            href: `#${basePath}`,
          },
        ];

        const rolesAPIClient = new RolesAPIClient(http);
        const RolesGridPageWithBreadcrumbs = () => {
          setBreadcrumbs(rolesBreadcrumbs);
          return <RolesGridPage notifications={notifications} rolesAPIClient={rolesAPIClient} />;
        };

        const EditRolePageWithBreadcrumbs = ({ action }: { action: 'edit' | 'clone' }) => {
          const { roleName } = useParams<{ roleName?: string }>();

          setBreadcrumbs([
            ...rolesBreadcrumbs,
            action === 'edit' && roleName
              ? { text: roleName, href: `#${basePath}/edit/${encodeURIComponent(roleName)}` }
              : {
                  text: i18n.translate('xpack.security.roles.createBreadcrumb', {
                    defaultMessage: 'Create',
                  }),
                },
          ]);

          return (
            <EditRolePage
              action={action}
              roleName={roleName}
              spacesEnabled={
                injectedMetadata.getInjectedVar('enableSpaceAwarePrivileges') as boolean
              }
              rolesAPIClient={rolesAPIClient}
              userAPIClient={new UserAPIClient(http)}
              indicesAPIClient={new IndicesAPIClient(http)}
              privilegesAPIClient={new PrivilegesAPIClient(http)}
              http={http}
              notifications={notifications}
              fatalErrors={fatalErrors}
              license={license}
              docLinks={new DocumentationLinksService(docLinks)}
              uiCapabilities={application.capabilities}
              indexPatterns={data.indexPatterns}
            />
          );
        };

        render(
          <i18nStart.Context>
            <Router basename={basePath}>
              <Switch>
                <Route path="/" exact={true}>
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
