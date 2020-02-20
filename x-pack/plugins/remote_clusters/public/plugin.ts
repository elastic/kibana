/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { CoreSetup, Plugin, CoreStart, PluginInitializerContext } from 'kibana/public';
import { init as initBreadcrumbs } from './application/services/breadcrumb';
import { init as initDocumentation } from './application/services/documentation';
import { init as initHttp } from './application/services/http';
import { init as initUiMetric } from './application/services/ui_metric';
import { init as initNotification } from './application/services/notification';
import { init as initRedirect } from './application/services/redirect';
import { Dependencies, ClientConfigType } from './types';

export class RemoteClustersUIPlugin implements Plugin<void, void, Dependencies, any> {
  constructor(private readonly initializerContext: PluginInitializerContext) {}

  setup(
    { notifications: { toasts }, http, getStartServices }: CoreSetup,
    { management, usageCollection }: Dependencies
  ) {
    const {
      ui: { enabled: isRemoteClustersUiEnabled },
    } = this.initializerContext.config.get<ClientConfigType>();

    if (isRemoteClustersUiEnabled) {
      const esSection = management.sections.getSection('elasticsearch');

      esSection!.registerApp({
        id: 'remote_clusters',
        title: i18n.translate('xpack.remoteClusters.appTitle', {
          defaultMessage: 'Remote Clusters',
        }),
        mount: async ({ element, setBreadcrumbs }) => {
          const [core] = await getStartServices();
          const {
            i18n: { Context: i18nContext },
            docLinks,
            fatalErrors,
          } = core;

          // Initialize services
          initBreadcrumbs(setBreadcrumbs);
          initDocumentation(docLinks);
          initUiMetric(usageCollection);
          initNotification(toasts, fatalErrors);
          initHttp(http);

          const { renderApp } = await import('./application');
          return renderApp(element, i18nContext);
        },
      });
    }
  }

  start({ application }: CoreStart) {
    const {
      ui: { enabled: isRemoteClustersUiEnabled },
    } = this.initializerContext.config.get<ClientConfigType>();

    if (isRemoteClustersUiEnabled) {
      initRedirect(application.navigateToApp);
    }
  }

  stop() {}
}
