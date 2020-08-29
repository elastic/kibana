/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { CoreSetup, PluginInitializerContext } from 'src/core/public';
import { FeatureCatalogueCategory } from '../../../../src/plugins/home/public';
import { PLUGIN } from '../common/constants';
import { init as initHttp } from './application/services/http';
import { init as initDocumentation } from './application/services/documentation';
import { init as initUiMetric } from './application/services/ui_metric';
import { init as initNotification } from './application/services/notification';
import { addAllExtensions } from './extend_index_management';
import { PluginsDependencies, ClientConfigType } from './types';

export class IndexLifecycleManagementPlugin {
  constructor(private readonly initializerContext: PluginInitializerContext) {}

  public setup(coreSetup: CoreSetup, plugins: PluginsDependencies) {
    const {
      ui: { enabled: isIndexLifecycleManagementUiEnabled },
    } = this.initializerContext.config.get<ClientConfigType>();

    if (isIndexLifecycleManagementUiEnabled) {
      const {
        http,
        notifications: { toasts },
        fatalErrors,
        getStartServices,
      } = coreSetup;

      const { usageCollection, management, indexManagement, home } = plugins;

      // Initialize services even if the app isn't mounted, because they're used by index management extensions.
      initHttp(http);
      initUiMetric(usageCollection);
      initNotification(toasts, fatalErrors);

      management.sections.section.data.registerApp({
        id: PLUGIN.ID,
        title: PLUGIN.TITLE,
        order: 2,
        mount: async ({ element, history }) => {
          const [coreStart] = await getStartServices();
          const {
            chrome: { docTitle },
            i18n: { Context: I18nContext },
            docLinks: { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION },
            application: { navigateToApp, getUrlForApp },
          } = coreStart;

          docTitle.change(PLUGIN.TITLE);

          // Initialize additional services.
          initDocumentation(
            `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/reference/${DOC_LINK_VERSION}/`
          );

          const { renderApp } = await import('./application');

          const unmountAppCallback = renderApp(
            element,
            I18nContext,
            history,
            navigateToApp,
            getUrlForApp
          );

          return () => {
            docTitle.reset();
            unmountAppCallback();
          };
        },
      });

      if (home) {
        home.featureCatalogue.register({
          id: PLUGIN.ID,
          title: i18n.translate('xpack.indexLifecycleMgmt.featureCatalogueTitle', {
            defaultMessage: 'Manage index lifecycles',
          }),
          description: i18n.translate('xpack.indexLifecycleMgmt.featureCatalogueDescription', {
            defaultMessage:
              'Define lifecycle policies to automatically perform operations as an index ages.',
          }),
          icon: 'indexSettings',
          path: '/app/management/data/index_lifecycle_management',
          showOnHomePage: true,
          category: FeatureCatalogueCategory.ADMIN,
          order: 640,
        });
      }

      if (indexManagement) {
        addAllExtensions(indexManagement.extensionsService);
      }
    }
  }

  public start() {}
  public stop() {}
}
