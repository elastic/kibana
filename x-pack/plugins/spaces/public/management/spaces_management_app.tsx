/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Router, Route, Switch, useParams } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import type { StartServicesAccessor } from 'src/core/public';
import type { RegisterManagementAppArgs } from '../../../../../src/plugins/management/public';
import type { PluginsStart } from '../plugin';
import type { SpacesManager } from '../spaces_manager';
import type { Space } from '..';
import { RedirectAppLinks } from '../../../../../src/plugins/kibana_react/public';

interface CreateParams {
  getStartServices: StartServicesAccessor<PluginsStart>;
  spacesManager: SpacesManager;
}

export const spacesManagementApp = Object.freeze({
  id: 'spaces',
  create({ getStartServices, spacesManager }: CreateParams) {
    return {
      id: this.id,
      order: 2,
      title: i18n.translate('xpack.spaces.displayName', {
        defaultMessage: 'Spaces',
      }),

      async mount({ element, setBreadcrumbs, history }) {
        const [startServices, { SpacesGridPage }, { ManageSpacePage }] = await Promise.all([
          getStartServices(),
          import('./spaces_grid'),
          import('./edit_space'),
        ]);

        const [{ notifications, i18n: i18nStart, application }, { features }] = startServices;
        const spacesBreadcrumbs = [
          {
            text: i18n.translate('xpack.spaces.management.breadcrumb', {
              defaultMessage: 'Spaces',
            }),
            href: `/`,
          },
        ];

        const SpacesGridPageWithBreadcrumbs = () => {
          setBreadcrumbs(spacesBreadcrumbs);
          return (
            <SpacesGridPage
              capabilities={application.capabilities}
              getFeatures={features.getFeatures}
              notifications={notifications}
              spacesManager={spacesManager}
              history={history}
              getUrlForApp={application.getUrlForApp}
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
              getFeatures={features.getFeatures}
              notifications={notifications}
              spacesManager={spacesManager}
              history={history}
              getUrlForApp={application.getUrlForApp}
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
                href: `/edit/${encodeURIComponent(space.id)}`,
              },
            ]);
          };

          return (
            <ManageSpacePage
              capabilities={application.capabilities}
              getFeatures={features.getFeatures}
              notifications={notifications}
              spacesManager={spacesManager}
              spaceId={spaceId}
              onLoadSpace={onLoadSpace}
              history={history}
              getUrlForApp={application.getUrlForApp}
            />
          );
        };

        render(
          <i18nStart.Context>
            <RedirectAppLinks application={application}>
              <Router history={history}>
                <Switch>
                  <Route path={['', '/']} exact>
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
            </RedirectAppLinks>
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
