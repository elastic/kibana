/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { useParams } from 'react-router-dom';
import { from, of, shareReplay } from 'rxjs';

import type { StartServicesAccessor } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { RegisterManagementAppArgs } from '@kbn/management-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import type { RolesAPIClient } from '@kbn/security-plugin-types-public';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { Route, Router, Routes } from '@kbn/shared-ux-router';

import type { Space } from '../../common';
import type { ConfigType } from '../config';
import { SOLUTION_NAV_FEATURE_FLAG_NAME } from '../constants';
import type { PluginsStart } from '../plugin';
import type { SpacesManager } from '../spaces_manager';

interface CreateParams {
  getStartServices: StartServicesAccessor<PluginsStart>;
  spacesManager: SpacesManager;
  config: ConfigType;
  getRolesAPIClient: () => Promise<RolesAPIClient>;
}

export const spacesManagementApp = Object.freeze({
  id: 'spaces',
  create({ getStartServices, spacesManager, config }: CreateParams) {
    const title = i18n.translate('xpack.spaces.displayName', {
      defaultMessage: 'Spaces',
    });

    return {
      id: this.id,
      order: 2,
      title,

      async mount({ element, setBreadcrumbs, history }) {
        const [
          [coreStart, { features, cloud, cloudExperiments }],
          { SpacesGridPage },
          { ManageSpacePage },
        ] = await Promise.all([
          getStartServices(),
          import('./spaces_grid'),
          import('./edit_space'),
        ]);

        const spacesFirstBreadcrumb = {
          text: title,
          href: `/`,
        };
        const { notifications, application, chrome } = coreStart;

        chrome.docTitle.change(title);

        const onCloud = Boolean(cloud?.isCloudEnabled);
        const isSolutionNavEnabled$ =
          // Only available on Cloud and if the Launch Darkly flag is turned on
          onCloud && cloudExperiments
            ? from(
                cloudExperiments
                  .getVariation(SOLUTION_NAV_FEATURE_FLAG_NAME, false)
                  .catch(() => false)
              ).pipe(shareReplay(1))
            : of(false);

        const SpacesGridPageWithBreadcrumbs = () => {
          setBreadcrumbs([{ ...spacesFirstBreadcrumb, href: undefined }]);
          return (
            <SpacesGridPage
              capabilities={application.capabilities}
              getFeatures={features.getFeatures}
              notifications={notifications}
              spacesManager={spacesManager}
              history={history}
              getUrlForApp={application.getUrlForApp}
              maxSpaces={config.maxSpaces}
            />
          );
        };

        const CreateSpacePageWithBreadcrumbs = () => {
          setBreadcrumbs([
            spacesFirstBreadcrumb,
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
              allowFeatureVisibility={config.allowFeatureVisibility}
              isSolutionNavEnabled$={isSolutionNavEnabled$}
            />
          );
        };

        const EditSpacePageWithBreadcrumbs = () => {
          const { spaceId } = useParams<{ spaceId: string }>();

          const onLoadSpace = (space: Space) => {
            setBreadcrumbs([
              spacesFirstBreadcrumb,
              {
                text: space.name,
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
              allowFeatureVisibility={config.allowFeatureVisibility}
              isSolutionNavEnabled$={isSolutionNavEnabled$}
            />
          );
        };

        render(
          <KibanaRenderContextProvider {...coreStart}>
            <KibanaContextProvider services={coreStart}>
              <RedirectAppLinks coreStart={coreStart}>
                <Router history={history}>
                  <Routes>
                    <Route path={['', '/']} exact>
                      <SpacesGridPageWithBreadcrumbs />
                    </Route>
                    <Route path="/create">
                      <CreateSpacePageWithBreadcrumbs />
                    </Route>
                    <Route path="/edit/:spaceId">
                      <EditSpacePageWithBreadcrumbs />
                    </Route>
                  </Routes>
                </Router>
              </RedirectAppLinks>
            </KibanaContextProvider>
          </KibanaRenderContextProvider>,
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
