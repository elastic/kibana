/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AppMountParameters, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { appIds } from '@kbn/management-cards-navigation';
import { createServerlessSearchSideNavComponent as createComponent } from './layout/nav';
import { docLinks } from '../common/doc_links';
import {
  ServerlessSearchPluginSetup,
  ServerlessSearchPluginSetupDependencies,
  ServerlessSearchPluginStart,
  ServerlessSearchPluginStartDependencies,
} from './types';

export class ServerlessSearchPlugin
  implements
    Plugin<
      ServerlessSearchPluginSetup,
      ServerlessSearchPluginStart,
      ServerlessSearchPluginSetupDependencies,
      ServerlessSearchPluginStartDependencies
    >
{
  public setup(
    core: CoreSetup<ServerlessSearchPluginStartDependencies, ServerlessSearchPluginStart>,
    _setupDeps: ServerlessSearchPluginSetupDependencies
  ): ServerlessSearchPluginSetup {
    core.application.register({
      id: 'serverlessElasticsearch',
      title: i18n.translate('xpack.serverlessSearch.app.elasticsearch.title', {
        defaultMessage: 'Elasticsearch',
      }),
      appRoute: '/app/elasticsearch',
      async mount({ element }: AppMountParameters) {
        const { renderApp } = await import('./application/elasticsearch');
        const [coreStart, services] = await core.getStartServices();
        const { security } = services;
        docLinks.setDocLinks(coreStart.docLinks.links);

        const userProfile = await security.userProfiles.getCurrent();

        return await renderApp(element, coreStart, { userProfile, ...services });
      },
    });

    core.application.register({
      id: 'serverlessConnectors',
      title: i18n.translate('xpack.serverlessSearch.app.connectors.title', {
        defaultMessage: 'Connectors',
      }),
      appRoute: '/app/connectors',
      async mount({ element }: AppMountParameters) {
        const { renderApp } = await import('./application/connectors');
        const [coreStart, services] = await core.getStartServices();
        const { security } = services;
        docLinks.setDocLinks(coreStart.docLinks.links);

        const userProfile = await security.userProfiles.getCurrent();

        return await renderApp(element, coreStart, { userProfile, ...services });
      },
    });

    return {};
  }

  public start(
    core: CoreStart,
    { serverless, management, cloud }: ServerlessSearchPluginStartDependencies
  ): ServerlessSearchPluginStart {
    serverless.setProjectHome('/app/elasticsearch');
    serverless.setSideNavComponent(createComponent(core, { serverless, cloud }));
    management.setupCardsNavigation({
      enabled: true,
      hideLinksTo: [appIds.MAINTENANCE_WINDOWS],
    });
    return {};
  }

  public stop() {}
}
