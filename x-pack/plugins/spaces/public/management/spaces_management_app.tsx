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
import type { StartServicesAccessor } from 'src/core/public';
import type { RegisterManagementAppArgs } from 'src/plugins/management/public';

import { APP_WRAPPER_CLASS } from '../../../../../src/core/public';
import {
  KibanaContextProvider,
  RedirectAppLinks,
} from '../../../../../src/plugins/kibana_react/public';
import type { Space } from '../../common';
import type { PluginsStart } from '../plugin';
import type { SpacesManager } from '../spaces_manager';

interface CreateParams {
  getStartServices: StartServicesAccessor<PluginsStart>;
  spacesManager: SpacesManager;
}

export const spacesManagementApp = Object.freeze({
  id: 'spaces',
  create({ getStartServices, spacesManager }: CreateParams) {
    const title = i18n.translate('xpack.spaces.displayName', {
      defaultMessage: 'Spaces',
    });

    return {
      id: this.id,
      order: 2,
      title,

      async mount({ element, setBreadcrumbs, history }) {
        const [
          [coreStart, { features }],
          { SpacesGridPage },
          { ManageSpacePage },
        ] = await Promise.all([
          getStartServices(),
          import('./spaces_grid'),
          import('./edit_space'),
        ]);

        const spacesBreadcrumbs = [
          {
            text: title,
            href: `/`,
          },
        ];
        const { notifications, i18n: i18nStart, application, chrome } = coreStart;

        chrome.docTitle.change(title);

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
              href: '/create',
            },
          ]);

          return (
            <ManageSpacePage
              capabilities={application.capabilities}
              getFeatures={features.getFeatures}
              notifications={notifications}
              spacesManager={spacesManager}
              history={history}
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
            />
          );
        };

        render(
          <KibanaContextProvider services={coreStart}>
            <i18nStart.Context>
              <RedirectAppLinks application={application} className={APP_WRAPPER_CLASS}>
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
