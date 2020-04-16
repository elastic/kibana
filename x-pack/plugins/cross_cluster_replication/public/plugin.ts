/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { get } from 'lodash';
import { first } from 'rxjs/operators';
import { CoreSetup, Plugin, PluginInitializerContext } from 'src/core/public';

import { PLUGIN } from '../common/constants';
import { init as initUiMetric } from './app/services/track_ui_metric';
import { init as initNotification } from './app/services/notifications';
import { PluginDependencies, ClientConfigType } from './types';

// @ts-ignore;
import { setHttpClient } from './app/services/api';

export class CrossClusterReplicationPlugin implements Plugin {
  constructor(private readonly initializerContext: PluginInitializerContext) {}

  public setup(coreSetup: CoreSetup, plugins: PluginDependencies) {
    const { licensing, remoteClusters, usageCollection, management, indexManagement } = plugins;

    licensing.license$
      .pipe(first())
      .toPromise()
      .then(license => {
        const isLicenseOk = license.isAvailable && license.isActive;

        const config = this.initializerContext.config.get<ClientConfigType>();

        // The UI is also dependent upon the Remote Clusters UI.
        const isCcrUiEnabled = config.ui.enabled && remoteClusters.isUiEnabled;

        if (isLicenseOk && isCcrUiEnabled) {
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

          management.sections.getSection('elasticsearch')!.registerApp({
            id: PLUGIN.ID,
            title: PLUGIN.TITLE,
            order: 4,
            mount: async ({ element, setBreadcrumbs }) => {
              const { mountApp } = await import('./app');

              const [coreStart] = await getStartServices();
              const {
                i18n: { Context: I18nContext },
                docLinks: { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION },
              } = coreStart;

              return mountApp({
                element,
                setBreadcrumbs,
                I18nContext,
                ELASTIC_WEBSITE_URL,
                DOC_LINK_VERSION,
              });
            },
          });

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
        }
      });
  }

  public start() {}
  public stop() {}
}
