/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n as kbnI18n } from '@kbn/i18n';

import { CoreSetup } from 'src/core/public';
import { DataPublicPluginStart } from 'src/plugins/data/public';
import { ManagementSetup } from 'src/plugins/management/public';

import { renderApp } from './app/app';
import { AppDependencies } from './app/app_dependencies';
import { breadcrumbService } from './app/services/navigation';
import { docTitleService } from './app/services/navigation';
import { textService } from './app/services/text';

export interface PluginsDependencies {
  data: DataPublicPluginStart;
  management: ManagementSetup;
}

export class TransformUiPlugin {
  public setup(coreSetup: CoreSetup<PluginsDependencies>, pluginsSetup: PluginsDependencies): void {
    const { management } = pluginsSetup;

    // Register management section
    const esSection = management.sections.getSection('elasticsearch');
    if (esSection !== undefined) {
      esSection.registerApp({
        id: 'transform',
        title: kbnI18n.translate('xpack.transform.appTitle', {
          defaultMessage: 'Transforms',
        }),
        order: 3,
        mount: async ({ element, setBreadcrumbs }) => {
          const { http, notifications, getStartServices } = coreSetup;
          const startServices = await getStartServices();
          const [core, plugins] = startServices;
          const { chrome, docLinks, i18n, overlays, savedObjects, uiSettings } = core;
          const { data } = plugins;
          const { docTitle } = chrome;

          // Initialize services
          textService.init();
          docTitleService.init(docTitle.change);
          breadcrumbService.setup(setBreadcrumbs);

          // AppCore/AppPlugins to be passed on as React context
          const appDependencies: AppDependencies = {
            chrome,
            data,
            docLinks,
            http,
            i18n,
            notifications,
            overlays,
            savedObjects,
            uiSettings,
          };

          return renderApp(element, appDependencies);
        },
      });
    }
  }

  public start() {}
  public stop() {}
}
