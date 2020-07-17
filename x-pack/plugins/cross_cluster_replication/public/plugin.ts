/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { get } from 'lodash';
import { first } from 'rxjs/operators';
import { CoreSetup, Plugin, PluginInitializerContext } from 'src/core/public';

import { PLUGIN, MANAGEMENT_ID } from '../common/constants';
import { init as initUiMetric } from './app/services/track_ui_metric';
import { init as initNotification } from './app/services/notifications';
import { PluginDependencies, ClientConfigType } from './types';

// @ts-ignore;
import { setHttpClient } from './app/services/api';

export class CrossClusterReplicationPlugin implements Plugin {
  constructor(private readonly initializerContext: PluginInitializerContext) {}

  public setup(coreSetup: CoreSetup, plugins: PluginDependencies) {
    const { licensing, remoteClusters, usageCollection, management, indexManagement } = plugins;
    const esSection = management.sections.section.data;

    const {
      http,
      notifications: { toasts },
      fatalErrors,
      getStartServices,
    } = coreSetup;

    // Initialize services even if the app isn't mounted, because they're used by index management extensions.
    setHttpClient(http);
    initUiMetric(usageCollection);
    initNotification(toasts, fatalErrors);

    const ccrApp = esSection.registerApp({
      id: MANAGEMENT_ID,
      title: PLUGIN.TITLE,
      order: 6,
      mount: async ({ element, setBreadcrumbs, history }) => {
        const { mountApp } = await import('./app');

        const [coreStart] = await getStartServices();
        const {
          chrome: { docTitle },
          i18n: { Context: I18nContext },
          docLinks: { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION },
          application: { getUrlForApp },
        } = coreStart;

        docTitle.change(PLUGIN.TITLE);

        const unmountAppCallback = await mountApp({
          element,
          setBreadcrumbs,
          I18nContext,
          ELASTIC_WEBSITE_URL,
          DOC_LINK_VERSION,
          history,
          getUrlForApp,
        });

        return () => {
          docTitle.reset();
          unmountAppCallback();
        };
      },
    });

    // NOTE: We enable the plugin by default instead of disabling it by default because this
    // creates a race condition that causes functional tests to fail on CI (see #66781).
    licensing.license$
      .pipe(first())
      .toPromise()
      .then((license) => {
        const licenseStatus = license.check(PLUGIN.ID, PLUGIN.minimumLicenseType);
        const isLicenseOk = licenseStatus.state === 'valid';
        const config = this.initializerContext.config.get<ClientConfigType>();

        // remoteClusters.isUiEnabled is driven by the xpack.remote_clusters.ui.enabled setting.
        // The CCR UI depends upon the Remote Clusters UI (e.g. by cross-linking to it), so if
        // the Remote Clusters UI is disabled we can't show the CCR UI.
        const isCcrUiEnabled = config.ui.enabled && remoteClusters.isUiEnabled;

        if (isLicenseOk && isCcrUiEnabled) {
          if (indexManagement) {
            const propertyPath = 'isFollowerIndex';

            const followerBadgeExtension = {
              matchIndex: (index: any) => {
                return get(index, propertyPath);
              },
              label: i18n.translate('xpack.crossClusterReplication.indexMgmtBadge.followerLabel', {
                defaultMessage: 'Follower',
              }),
              color: 'default',
              filterExpression: 'isFollowerIndex:true',
            };

            indexManagement.extensionsService.addBadge(followerBadgeExtension);
          }
        } else {
          ccrApp.disable();
        }
      });
  }

  public start() {}
  public stop() {}
}
