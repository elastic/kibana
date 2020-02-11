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
import { SecurityLicense } from '../../../security/public';
import { RegisterManagementAppArgs } from '../../../../../src/plugins/management/public';
import { PluginsStart } from '../plugin';
import { SpacesManager } from '../spaces_manager';
import { SpacesGridPage } from './spaces_grid';
import { ManageSpacePage } from './edit_space';
import { Space } from '..';

interface CreateParams {
  getStartServices: CoreSetup<PluginsStart>['getStartServices'];
  spacesManager: SpacesManager;
  securityLicense?: SecurityLicense;
}

export const spacesManagementApp = Object.freeze({
  id: 'spaces',
  create({ getStartServices, spacesManager, securityLicense }: CreateParams) {
    return {
      id: this.id,
      order: 10,
      title: i18n.translate('xpack.spaces.displayName', {
        defaultMessage: 'Spaces',
      }),
      async mount({ basePath, element, setBreadcrumbs }) {
        const [{ http, notifications, i18n: i18nStart, application }] = await getStartServices();
        const spacesBreadcrumbs = [
          {
            text: i18n.translate('xpack.spaces.management.breadcrumb', {
              defaultMessage: 'Spaces',
            }),
            href: `#${basePath}`,
          },
        ];

        const SpacesGridPageWithBreadcrumbs = () => {
          setBreadcrumbs(spacesBreadcrumbs);
          return (
            <SpacesGridPage
              capabilities={application.capabilities}
              http={http}
              notifications={notifications}
              spacesManager={spacesManager}
              securityEnabled={securityLicense?.getFeatures().showLinks ?? false}
            />
          );
        };

        const CreateSpacePageWithBreadcrumbs = () => {
          setBreadcrumbs([
            ...spacesBreadcrumbs,
            {
              text: i18n.translate('xpack.spaces.management.createSpaceBreadcrumb', {
                defaultMessage: 'Create',
              }),
            },
          ]);

          return (
            <ManageSpacePage
              capabilities={application.capabilities}
              http={http}
              notifications={notifications}
              spacesManager={spacesManager}
              securityEnabled={securityLicense?.getFeatures().showLinks ?? false}
            />
          );
        };

        const EditSpacePageWithBreadcrumbs = () => {
          const { spaceId } = useParams<{ spaceId: string }>();

          const onLoadSpace = (space: Space) => {
            setBreadcrumbs([
              ...spacesBreadcrumbs,
              {
                text: space.name,
                href: `#${basePath}/edit/${encodeURIComponent(space.id)}`,
              },
            ]);
          };

          return (
            <ManageSpacePage
              capabilities={application.capabilities}
              http={http}
              notifications={notifications}
              spacesManager={spacesManager}
              spaceId={spaceId}
              onLoadSpace={onLoadSpace}
              securityEnabled={securityLicense?.getFeatures().showLinks ?? false}
            />
          );
        };

        render(
          <i18nStart.Context>
            <Router basename={basePath}>
              <Switch>
                <Route path="/" exact>
                  <SpacesGridPageWithBreadcrumbs />
                </Route>
                <Route path="/create">
                  <CreateSpacePageWithBreadcrumbs />
                </Route>
                <Route path="/edit/:spaceId">
                  <EditSpacePageWithBreadcrumbs />
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
