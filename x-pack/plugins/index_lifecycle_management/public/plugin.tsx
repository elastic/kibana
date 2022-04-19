/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom } from 'rxjs';
import { i18n } from '@kbn/i18n';
import { CoreSetup, PluginInitializerContext, Plugin } from '@kbn/core/public';
<<<<<<< HEAD
=======
import { FeatureCatalogueCategory } from '@kbn/home-plugin/public';
>>>>>>> upstream/main
import { PLUGIN } from '../common/constants';
import { init as initHttp } from './application/services/http';
import { init as initUiMetric } from './application/services/ui_metric';
import { init as initNotification } from './application/services/notification';
import { BreadcrumbService } from './application/services/breadcrumbs';
import { addAllExtensions } from './extend_index_management';
import { ClientConfigType, SetupDependencies, StartDependencies } from './types';
import { IlmLocatorDefinition } from './locator';

export class IndexLifecycleManagementPlugin
  implements Plugin<void, void, SetupDependencies, StartDependencies>
{
  constructor(private readonly initializerContext: PluginInitializerContext) {}

  private breadcrumbService = new BreadcrumbService();

  public setup(coreSetup: CoreSetup<StartDependencies>, plugins: SetupDependencies) {
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

      const { usageCollection, management, indexManagement, home, cloud } = plugins;

      // Initialize services even if the app isn't mounted, because they're used by index management extensions.
      initHttp(http);
      initUiMetric(usageCollection);
      initNotification(toasts, fatalErrors);

      management.sections.section.data.registerApp({
        id: PLUGIN.ID,
        title: PLUGIN.TITLE,
        order: 2,
        mount: async ({ element, history, setBreadcrumbs, theme$ }) => {
          const [coreStart, { licensing }] = await getStartServices();
          const {
            chrome: { docTitle },
            i18n: { Context: I18nContext },
            application,
            docLinks,
            executionContext,
          } = coreStart;

          const license = await firstValueFrom(licensing.license$);

          docTitle.change(PLUGIN.TITLE);
          this.breadcrumbService.setup(setBreadcrumbs);

          const { renderApp } = await import('./application');

          const unmountAppCallback = renderApp(
            element,
            I18nContext,
            history,
            application,
            this.breadcrumbService,
            license,
            theme$,
            docLinks,
            executionContext,
            cloud
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
          icon: 'indexRollupApp',
          path: '/app/management/data/index_lifecycle_management',
          showOnHomePage: true,
          category: 'admin',
          order: 640,
        });
      }

      if (indexManagement) {
        addAllExtensions(indexManagement.extensionsService);
      }

      plugins.share.url.locators.create(
        new IlmLocatorDefinition({
          managementAppLocator: plugins.management.locator,
        })
      );
    }
  }

  public start() {}

  public stop() {}
}
