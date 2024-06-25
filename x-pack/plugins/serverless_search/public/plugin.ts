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
import { QueryClient, MutationCache, QueryCache } from '@tanstack/react-query';
import { of } from 'rxjs';
import { createIndexMappingsDocsLinkContent as createIndexMappingsContent } from './application/components/index_management/index_mappings_docs_link';
import { createIndexOverviewContent } from './application/components/index_management/index_overview_content';
import { docLinks } from '../common/doc_links';
import {
  ServerlessSearchPluginSetup,
  ServerlessSearchPluginSetupDependencies,
  ServerlessSearchPluginStart,
  ServerlessSearchPluginStartDependencies,
} from './types';
import { createIndexDocumentsContent } from './application/components/index_documents/documents_tab';
import { getErrorCode, getErrorMessage, isKibanaServerError } from './utils/get_error_message';
import { navigationTree } from './navigation_tree';

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
    setupDeps: ServerlessSearchPluginSetupDependencies
  ): ServerlessSearchPluginSetup {
    const { searchHomepage } = setupDeps;
    const useSearchHomepage = searchHomepage && searchHomepage.isHomepageFeatureEnabled();

    const queryClient = new QueryClient({
      mutationCache: new MutationCache({
        onError: (error) => {
          core.notifications.toasts.addError(error as Error, {
            title: (error as Error).name,
            toastMessage: getErrorMessage(error),
            toastLifeTimeMs: 1000,
          });
        },
      }),
      queryCache: new QueryCache({
        onError: (error) => {
          // 404s are often functionally okay and shouldn't show toasts by default
          if (getErrorCode(error) === 404) {
            return;
          }
          if (isKibanaServerError(error) && !error.skipToast) {
            core.notifications.toasts.addError(error, {
              title: error.name,
              toastMessage: getErrorMessage(error),
              toastLifeTimeMs: 1000,
            });
          }
        },
      }),
    });
    if (useSearchHomepage) {
      core.application.register({
        id: 'serverlessHomeRedirect',
        title: i18n.translate('xpack.serverlessSearch.app.home.title', {
          defaultMessage: 'Home',
        }),
        appRoute: '/app/elasticsearch',
        euiIconType: 'logoElastic',
        category: DEFAULT_APP_CATEGORIES.enterpriseSearch,
        visibleIn: [],
        async mount({}: AppMountParameters) {
          const [coreStart] = await core.getStartServices();
          coreStart.application.navigateToApp('searchHomepage');
          return () => {};
        },
      });
    }

    core.application.register({
      id: 'serverlessElasticsearch',
      title: i18n.translate('xpack.serverlessSearch.app.elasticsearch.title', {
        defaultMessage: 'Elasticsearch',
      }),
      euiIconType: 'logoElastic',
      category: DEFAULT_APP_CATEGORIES.enterpriseSearch,
      appRoute: useSearchHomepage ? '/app/elasticsearch/getting_started' : '/app/elasticsearch',
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

        return await renderApp(element, coreStart, { history, user, ...services }, queryClient);
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
      visibleIn: [],
      async mount({ element, history }: AppMountParameters) {
        const { renderApp } = await import('./application/connectors');
        const [coreStart, services] = await core.getStartServices();

        docLinks.setDocLinks(coreStart.docLinks.links);
        return await renderApp(element, coreStart, { history, ...services }, queryClient);
      },
    });

    setupDeps.discover.showInlineTopNav();

    return {};
  }

  public start(
    core: CoreStart,
    services: ServerlessSearchPluginStartDependencies
  ): ServerlessSearchPluginStart {
    const { serverless, management, indexManagement, security, searchHomepage } = services;
    const useSearchHomepage = searchHomepage && searchHomepage.isHomepageFeatureEnabled();

    serverless.setProjectHome(useSearchHomepage ? '/app/elasticsearch/home' : '/app/elasticsearch');

    const navigationTree$ = of(navigationTree(searchHomepage?.isHomepageFeatureEnabled() ?? false));
    serverless.initNavigation('search', navigationTree$, { dataTestSubj: 'svlSearchSideNav' });

    const extendCardNavDefinitions = serverless.getNavigationCards(
      security.authz.isRoleManagementEnabled()
    );

    management.setupCardsNavigation({
      enabled: true,
      hideLinksTo: [appIds.MAINTENANCE_WINDOWS],
      extendCardNavDefinitions,
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
