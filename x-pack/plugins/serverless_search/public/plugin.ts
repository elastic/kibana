/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AppMountParameters,
  CoreSetup,
  CoreStart,
  DEFAULT_APP_CATEGORIES,
  Plugin,
} from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { appIds } from '@kbn/management-cards-navigation';
import { AuthenticatedUser } from '@kbn/security-plugin/common';
import { createIndexMappingsDocsLinkContent as createIndexMappingsContent } from './application/components/index_management/index_mappings_docs_link';
import { createIndexOverviewContent } from './application/components/index_management/index_overview_content';
import { createServerlessSearchSideNavComponent as createComponent } from './layout/nav';
import { docLinks } from '../common/doc_links';
import {
  ServerlessSearchPluginSetup,
  ServerlessSearchPluginSetupDependencies,
  ServerlessSearchPluginStart,
  ServerlessSearchPluginStartDependencies,
} from './types';
import { createIndexDocumentsContent } from './application/components/index_documents/documents_tab';

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
      euiIconType: 'logoElastic',
      category: DEFAULT_APP_CATEGORIES.enterpriseSearch,
      appRoute: '/app/elasticsearch',
      async mount({ element, history }: AppMountParameters) {
        const { renderApp } = await import('./application/elasticsearch');
        const [coreStart, services] = await core.getStartServices();
        const { security } = services;
        docLinks.setDocLinks(coreStart.docLinks.links);
        let user: AuthenticatedUser | undefined;
        try {
          const response = await security.authc.getCurrentUser();
          user = response;
        } catch {
          user = undefined;
        }

        return await renderApp(element, coreStart, { history, user, ...services });
      },
    });

    core.application.register({
      id: 'serverlessConnectors',
      title: i18n.translate('xpack.serverlessSearch.app.connectors.title', {
        defaultMessage: 'Connectors',
      }),
      appRoute: '/app/connectors',
      euiIconType: 'logoElastic',
      category: DEFAULT_APP_CATEGORIES.enterpriseSearch,
      searchable: false,
      async mount({ element, history }: AppMountParameters) {
        const { renderApp } = await import('./application/connectors');
        const [coreStart, services] = await core.getStartServices();

        docLinks.setDocLinks(coreStart.docLinks.links);
        return await renderApp(element, coreStart, { history, ...services });
      },
    });
    return {};
  }

  public start(
    core: CoreStart,
    services: ServerlessSearchPluginStartDependencies
  ): ServerlessSearchPluginStart {
    const { serverless, management, cloud, indexManagement } = services;
    serverless.setProjectHome('/app/elasticsearch');
    serverless.setSideNavComponent(createComponent(core, { serverless, cloud }));
    management.setIsSidebarEnabled(false);
    management.setupCardsNavigation({
      enabled: true,
      hideLinksTo: [appIds.MAINTENANCE_WINDOWS],
    });
    indexManagement?.extensionsService.setIndexMappingsContent(createIndexMappingsContent(core));
    indexManagement?.extensionsService.addIndexDetailsTab(
      createIndexDocumentsContent(core, services)
    );
    indexManagement?.extensionsService.setIndexOverviewContent(
      createIndexOverviewContent(core, services)
    );
    return {};
  }

  public stop() {}
}
