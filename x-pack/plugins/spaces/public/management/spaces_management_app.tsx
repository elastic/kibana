/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { useParams } from 'react-router-dom';

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
import type { PluginsStart } from '../plugin';
import type { SpacesManager } from '../spaces_manager';

interface CreateParams {
  getStartServices: StartServicesAccessor<PluginsStart>;
  spacesManager: SpacesManager;
  config: ConfigType;
  getRolesAPIClient: () => Promise<RolesAPIClient>;
  solutionNavExperiment: Promise<boolean>;
}

export const spacesManagementApp = Object.freeze({
  id: 'spaces',
  create({
    getStartServices,
    spacesManager,
    config,
    solutionNavExperiment,
    getRolesAPIClient,
  }: CreateParams) {
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
          { ViewSpacePage },
        ] = await Promise.all([
          getStartServices(),
          import('./spaces_grid'),
          import('./edit_space'),
          import('./view_space'),
        ]);

        const spacesFirstBreadcrumb = {
          text: title,
          href: `/`,
        };
        const { notifications, application, chrome, http } = coreStart;

        chrome.docTitle.change(title);

        const SpacesGridPageWithBreadcrumbs = () => {
          setBreadcrumbs([{ ...spacesFirstBreadcrumb, href: undefined }]);
          return (
            <SpacesGridPage
              capabilities={application.capabilities}
              getFeatures={features.getFeatures}
              notifications={notifications}
              spacesManager={spacesManager}
              serverBasePath={http.basePath.serverBasePath}
              history={history}
              getUrlForApp={application.getUrlForApp}
              maxSpaces={config.maxSpaces}
              solutionNavExperiment={solutionNavExperiment}
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
              solutionNavExperiment={solutionNavExperiment}
            />
          );
        };

        const SpacePageWithBreadcrumbs = ({ context }: { context: 'edit' | 'view' }) => {
          const { spaceId, selectedTabId } = useParams<{
            spaceId: string;
            selectedTabId?: string;
          }>();

          const breadcrumbText = (space: Space) =>
            context === 'edit'
              ? i18n.translate('xpack.spaces.management.editSpaceBreadcrumb', {
                  defaultMessage: 'Edit {space}',
                  values: { space: space.name },
                })
              : i18n.translate('xpack.spaces.management.viewSpaceBreadcrumb', {
                  defaultMessage: 'View {space}',
                  values: { space: space.name },
                });

          const onLoadSpace = (space: Space) => {
            setBreadcrumbs([
              spacesFirstBreadcrumb,
              {
                text: breadcrumbText(space),
              },
            ]);
          };

          if (context === 'edit') {
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
                solutionNavExperiment={solutionNavExperiment}
              />
            );
          }

          return (
            <ViewSpacePage
              capabilities={application.capabilities}
              getFeatures={features.getFeatures}
              getUrlForApp={application.getUrlForApp}
              navigateToUrl={application.navigateToUrl}
              serverBasePath={http.basePath.serverBasePath}
              spacesManager={spacesManager}
              history={history}
              allowFeatureVisibility={config.allowFeatureVisibility}
              solutionNavExperiment={solutionNavExperiment}
              onLoadSpace={onLoadSpace}
              spaceId={spaceId}
              selectedTabId={selectedTabId}
              getRolesAPIClient={getRolesAPIClient}
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
                      <SpacePageWithBreadcrumbs context="edit" />
                    </Route>
                    <Route path={['/view/:spaceId', '/view/:spaceId/:selectedTabId']} exact>
                      <SpacePageWithBreadcrumbs context="view" />
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
