/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, Plugin, CoreStart, PluginInitializerContext } from 'kibana/public';

import { ManagementSectionId } from '../../../../src/plugins/management/public';
import { PLUGIN } from '../common/constants';
import { init as initBreadcrumbs } from './application/services/breadcrumb';
import { init as initDocumentation } from './application/services/documentation';
import { init as initHttp } from './application/services/http';
import { init as initUiMetric } from './application/services/ui_metric';
import { init as initNotification } from './application/services/notification';
import { init as initRedirect } from './application/services/redirect';
import { Dependencies, ClientConfigType } from './types';

export interface RemoteClustersPluginSetup {
  isUiEnabled: boolean;
}

export class RemoteClustersUIPlugin
  implements Plugin<RemoteClustersPluginSetup, void, Dependencies, any> {
  constructor(private readonly initializerContext: PluginInitializerContext) {}

  setup(
    { notifications: { toasts }, http, getStartServices }: CoreSetup,
    { management, usageCollection, cloud }: Dependencies
  ) {
    const {
      ui: { enabled: isRemoteClustersUiEnabled },
    } = this.initializerContext.config.get<ClientConfigType>();

    if (isRemoteClustersUiEnabled) {
      const esSection = management.sections.getSection(ManagementSectionId.Data);

      esSection.registerApp({
        id: 'remote_clusters',
        title: PLUGIN.title,
        order: 7,
        mount: async ({ element, setBreadcrumbs, history }) => {
          const [core] = await getStartServices();
          const {
            i18n: { Context: i18nContext },
            docLinks,
            fatalErrors,
            chrome: { docTitle },
          } = core;

          // Initialize services
          initBreadcrumbs(setBreadcrumbs);
          initDocumentation(docLinks);
          initUiMetric(usageCollection);
          initNotification(toasts, fatalErrors);
          initHttp(http);

          const isCloudEnabled = Boolean(cloud?.isCloudEnabled);

          const { renderApp } = await import('./application');
          return renderApp(element, i18nContext, { isCloudEnabled, docTitle }, history);
        },
      });
    }

    return {
      isUiEnabled: isRemoteClustersUiEnabled,
    };
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
