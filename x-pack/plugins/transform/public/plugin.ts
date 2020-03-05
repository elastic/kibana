/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';

import { CoreSetup } from '../../../../src/core/public';
import { ManagementSetup } from '../../../../src/plugins/management/public';

import { renderApp } from './app/app';
import { AppDependencies } from './app/app_dependencies';
import { breadcrumbService } from './app/services/navigation';
import { docTitleService } from './app/services/navigation';
import { textService } from './app/services/text';

export interface PluginsDependencies {
  data: any;
  management: ManagementSetup;
}

export class TransformUiPlugin {
  public setup(coreSetup: CoreSetup, pluginsSetup: PluginsDependencies): void {
    const { management } = pluginsSetup;

    // Register management section
    const esSection = management.sections.getSection('elasticsearch');
    if (esSection !== undefined) {
      esSection.registerApp({
        id: 'transform',
        title: i18n.translate('xpack.transform.appTitle', {
          defaultMessage: 'Transforms',
        }),
        order: 3,
        mount: async ({ element, setBreadcrumbs }) => {
          const { http, notifications, getStartServices } = coreSetup;
          const startServices = await getStartServices();
          const [core, plugins] = startServices;
          const { chrome, docLinks, uiSettings, savedObjects, overlays } = core;
          const { data } = plugins as PluginsDependencies;
          const { docTitle } = chrome;

          // Initialize services
          textService.init();
          docTitleService.init(docTitle.change);
          breadcrumbService.setup(setBreadcrumbs);

          // AppCore/AppPlugins to be passed on as React context
          const appDependencies: AppDependencies = {
            chrome,
            docLinks,
            http,
            i18n: core.i18n,
            notifications,
            uiSettings,
            savedObjects,
            overlays,
            data,
          };

          return renderApp(element, appDependencies);
        },
      });
    }
  }

  public start() {}
  public stop() {}
}
